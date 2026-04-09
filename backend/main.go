package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/heroiclabs/nakama-common/runtime"
)

// InitModule is called once when Nakama loads the Go module.
// We register:
// 1. RPCs for lobby actions such as create/list/find match.
// 2. The authoritative match handler that owns all game rules.
func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("TicTacToe module initializing...")

	// Register RPC functions
	if err := initializer.RegisterRpc("create_match", rpcCreateMatch); err != nil {
		return fmt.Errorf("failed to register create_match RPC: %w", err)
	}
	if err := initializer.RegisterRpc("find_match", rpcFindMatch); err != nil {
		return fmt.Errorf("failed to register find_match RPC: %w", err)
	}
	if err := initializer.RegisterRpc("list_matches", rpcListMatches); err != nil {
		return fmt.Errorf("failed to register list_matches RPC: %w", err)
	}

	// Register match handler
	if err := initializer.RegisterMatch("tictactoe", func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule) (runtime.Match, error) {
		return &TicTacToeMatch{}, nil
	}); err != nil {
		return fmt.Errorf("failed to register match handler: %w", err)
	}

	logger.Info("TicTacToe module initialized successfully")
	return nil
}

// ============================================================
// GAME STATE & TYPES
// ============================================================

const (
	OpCodeMove        = 1
	OpCodeGameState   = 2
	OpCodePlayerJoin  = 3
	OpCodePlayerLeave = 4
	OpCodeGameOver    = 5
	OpCodeRematch     = 6
	OpCodeReady       = 7

	MaxPlayers = 2
	BoardSize  = 9
)

type GameStatus string

const (
	StatusWaiting  GameStatus = "waiting"
	StatusPlaying  GameStatus = "playing"
	StatusGameOver GameStatus = "game_over"
)

type PlayerInfo struct {
	UserID      string `json:"user_id"`
	Username    string `json:"username"`
	Symbol      string `json:"symbol"` // "X" or "O"
	IsConnected bool   `json:"is_connected"`
	Score       int    `json:"score"`
}

type GameState struct {
	Board        [9]string  `json:"board"`         // "", "X", "O"
	CurrentTurn  string     `json:"current_turn"`  // user_id of current player
	Status       GameStatus `json:"status"`
	Winner       string     `json:"winner"`        // user_id or "draw"
	WinningLine  []int      `json:"winning_line"`  // indices of winning cells
	Players      []PlayerInfo `json:"players"`
	MoveCount    int        `json:"move_count"`
	MatchID      string     `json:"match_id"`
	Round        int        `json:"round"`
}

// MatchState is the private server-side state for one live match.
// Game is the serializable payload sent to clients.
// Presences and ReadyPlayers are runtime-only helpers used by Nakama.
type MatchState struct {
	Game       GameState
	Presences  map[string]runtime.Presence
	ReadyPlayers map[string]bool
}

type MoveMessage struct {
	Position int `json:"position"` // 0-8
}

type GameStateMessage struct {
	GameState GameState `json:"game_state"`
	Message   string    `json:"message,omitempty"`
}

// ============================================================
// MATCH HANDLER
// ============================================================

// TicTacToeMatch implements Nakama's authoritative match lifecycle.
// Every move is validated here so the browser stays as a thin renderer only.
type TicTacToeMatch struct{}

func (m *TicTacToeMatch) MatchInit(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	logger.Info("TicTacToe match initializing")

	state := &MatchState{
		Presences:    make(map[string]runtime.Presence),
		ReadyPlayers: make(map[string]bool),
		Game: GameState{
			Board:   [9]string{},
			Status:  StatusWaiting,
			Players: []PlayerInfo{},
			Round:   1,
		},
	}

	// Tick rate: 5 ticks per second
	return state, 5, "tictactoe"
}

func (m *TicTacToeMatch) MatchJoinAttempt(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presence runtime.Presence, metadata map[string]string) (interface{}, bool, string) {
	mState, ok := state.(*MatchState)
	if !ok {
		return state, false, "invalid state"
	}

	// Allow join if less than 2 players
	if len(mState.Presences) >= MaxPlayers {
		return state, false, "match is full"
	}

	return state, true, ""
}

func (m *TicTacToeMatch) MatchJoin(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	mState, ok := state.(*MatchState)
	if !ok {
		return state
	}

	for _, presence := range presences {
		mState.Presences[presence.GetUserId()] = presence

		// Symbols are assigned in join order. Reconnects keep the symbol they already had.
		symbol := "X"
		if len(mState.Game.Players) == 1 {
			symbol = "O"
		}

		// Check if player was already in the game (reconnect)
		found := false
		for i, p := range mState.Game.Players {
			if p.UserID == presence.GetUserId() {
				mState.Game.Players[i].IsConnected = true
				found = true
				break
			}
		}

		if !found {
			mState.Game.Players = append(mState.Game.Players, PlayerInfo{
				UserID:      presence.GetUserId(),
				Username:    presence.GetUsername(),
				Symbol:      symbol,
				IsConnected: true,
				Score:       0,
			})
		}

		logger.Info("Player %s (%s) joined as %s", presence.GetUsername(), presence.GetUserId(), symbol)
	}

	// The match stays in "waiting" until both seats are filled.
	if len(mState.Game.Players) == MaxPlayers && mState.Game.Status == StatusWaiting {
		mState.Game.Status = StatusPlaying
		// Randomize the opening turn once, then rematches alternate it later.
		rand.Seed(time.Now().UnixNano())
		firstPlayerIdx := rand.Intn(2)
		mState.Game.CurrentTurn = mState.Game.Players[firstPlayerIdx].UserID
		logger.Info("Game started! %s goes first", mState.Game.Players[firstPlayerIdx].Username)
	}

	// Clients render only from this payload, so every meaningful state change is broadcast.
	broadcastGameState(dispatcher, mState, "")

	return mState
}

func (m *TicTacToeMatch) MatchLeave(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	mState, ok := state.(*MatchState)
	if !ok {
		return state
	}

	for _, presence := range presences {
		delete(mState.Presences, presence.GetUserId())

		// Mark player as disconnected
		for i, p := range mState.Game.Players {
			if p.UserID == presence.GetUserId() {
				mState.Game.Players[i].IsConnected = false
				break
			}
		}

		logger.Info("Player %s left the match", presence.GetUsername())

		// If game is in progress and a player leaves, they forfeit
		if mState.Game.Status == StatusPlaying {
			// Find the other player as winner
			for _, p := range mState.Game.Players {
				if p.UserID != presence.GetUserId() {
					mState.Game.Winner = p.UserID
					mState.Game.Status = StatusGameOver
					// Update score
					for i, player := range mState.Game.Players {
						if player.UserID == p.UserID {
							mState.Game.Players[i].Score++
						}
					}
					break
				}
			}
			broadcastGameState(dispatcher, mState, fmt.Sprintf("%s disconnected. Game over!", presence.GetUsername()))
		}
	}

	return mState
}

func (m *TicTacToeMatch) MatchLoop(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, messages []runtime.MatchData) interface{} {
	mState, ok := state.(*MatchState)
	if !ok {
		return state
	}

	for _, msg := range messages {
		switch msg.GetOpCode() {
		case OpCodeMove:
			handleMove(ctx, logger, dispatcher, mState, msg)
		case OpCodeRematch:
			handleRematch(ctx, logger, dispatcher, mState, msg)
		case OpCodeReady:
			handleReady(ctx, logger, dispatcher, mState, msg)
		}
	}

	// If no players remain, end the match
	if len(mState.Presences) == 0 {
		logger.Info("No players remain, ending match")
		return nil
	}

	return mState
}

func (m *TicTacToeMatch) MatchTerminate(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, graceSeconds int) interface{} {
	logger.Info("Match terminating")
	return state
}

func (m *TicTacToeMatch) MatchSignal(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, data string) (interface{}, string) {
	return state, ""
}

// ============================================================
// GAME LOGIC (SERVER-AUTHORITATIVE)
// ============================================================

// handleMove is the core anti-cheat path.
// It rejects invalid input, applies only valid moves, and then broadcasts the new state.
func handleMove(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, mState *MatchState, msg runtime.MatchData) {
	// Validate game is in progress
	if mState.Game.Status != StatusPlaying {
		sendError(dispatcher, msg, "Game is not in progress")
		return
	}

	// Validate it's this player's turn
	if mState.Game.CurrentTurn != msg.GetUserId() {
		sendError(dispatcher, msg, "It's not your turn")
		return
	}

	// Parse move
	var move MoveMessage
	if err := json.Unmarshal(msg.GetData(), &move); err != nil {
		sendError(dispatcher, msg, "Invalid move data")
		return
	}

	// Validate position
	if move.Position < 0 || move.Position >= BoardSize {
		sendError(dispatcher, msg, "Invalid position")
		return
	}

	// Validate cell is empty
	if mState.Game.Board[move.Position] != "" {
		sendError(dispatcher, msg, "Cell is already occupied")
		return
	}

	// The frontend sends only a board position. The server decides which symbol belongs there.
	var playerSymbol string
	for _, p := range mState.Game.Players {
		if p.UserID == msg.GetUserId() {
			playerSymbol = p.Symbol
			break
		}
	}

	// Apply move
	mState.Game.Board[move.Position] = playerSymbol
	mState.Game.MoveCount++

	logger.Info("Player %s placed %s at position %d", msg.GetUserId(), playerSymbol, move.Position)

	// Winners are calculated on the server so both clients stay consistent.
	winner, winLine := checkWinner(mState.Game.Board)

	if winner != "" {
		mState.Game.Status = StatusGameOver
		mState.Game.WinningLine = winLine

		if winner == "draw" {
			mState.Game.Winner = "draw"
			broadcastGameState(dispatcher, mState, "It's a draw!")
		} else {
			// Find user_id of winner
			for i, p := range mState.Game.Players {
				if p.Symbol == winner {
					mState.Game.Winner = p.UserID
					mState.Game.Players[i].Score++
					broadcastGameState(dispatcher, mState, fmt.Sprintf("%s wins!", p.Username))
					break
				}
			}
		}
	} else {
		// Switch turns
		for _, p := range mState.Game.Players {
			if p.UserID != msg.GetUserId() {
				mState.Game.CurrentTurn = p.UserID
				break
			}
		}
		broadcastGameState(dispatcher, mState, "")
	}
}

func handleRematch(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, mState *MatchState, msg runtime.MatchData) {
	if mState.Game.Status != StatusGameOver {
		return
	}

	mState.ReadyPlayers[msg.GetUserId()] = true
	logger.Info("Player %s wants a rematch (%d/%d ready)", msg.GetUserId(), len(mState.ReadyPlayers), len(mState.Game.Players))

	// A new round begins only after both players have opted in.
	if len(mState.ReadyPlayers) == MaxPlayers {
		mState.Game.Board = [9]string{}
		mState.Game.Status = StatusPlaying
		mState.Game.Winner = ""
		mState.Game.WinningLine = nil
		mState.Game.MoveCount = 0
		mState.Game.Round++
		mState.ReadyPlayers = make(map[string]bool)

		// Alternate the opening player to keep rounds fair over time.
		if mState.Game.Round%2 == 0 {
			mState.Game.CurrentTurn = mState.Game.Players[1].UserID
		} else {
			mState.Game.CurrentTurn = mState.Game.Players[0].UserID
		}

		broadcastGameState(dispatcher, mState, "New round started!")
	} else {
		broadcastGameState(dispatcher, mState, "Waiting for opponent to accept rematch...")
	}
}

func handleReady(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, mState *MatchState, msg runtime.MatchData) {
	broadcastGameState(dispatcher, mState, "")
}

func checkWinner(board [9]string) (string, []int) {
	// The frontend uses the returned line to highlight the winning cells.
	winPatterns := [][]int{
		{0, 1, 2}, {3, 4, 5}, {6, 7, 8}, // rows
		{0, 3, 6}, {1, 4, 7}, {2, 5, 8}, // cols
		{0, 4, 8}, {2, 4, 6},             // diagonals
	}

	for _, pattern := range winPatterns {
		a, b, c := board[pattern[0]], board[pattern[1]], board[pattern[2]]
		if a != "" && a == b && b == c {
			return a, pattern
		}
	}

	// Check draw
	full := true
	for _, cell := range board {
		if cell == "" {
			full = false
			break
		}
	}
	if full {
		return "draw", nil
	}

	return "", nil
}

func broadcastGameState(dispatcher runtime.MatchDispatcher, mState *MatchState, message string) {
	// All client views are driven from this canonical server snapshot.
	msg := GameStateMessage{
		GameState: mState.Game,
		Message:   message,
	}
	data, _ := json.Marshal(msg)
	dispatcher.BroadcastMessage(OpCodeGameState, data, nil, nil, true)
}

func sendError(dispatcher runtime.MatchDispatcher, msg runtime.MatchData, errMsg string) {
	// Errors are sent only to the player who triggered the invalid action.
	type ErrorMessage struct {
		Error string `json:"error"`
	}
	data, _ := json.Marshal(ErrorMessage{Error: errMsg})
	presences := []runtime.Presence{msg}
	dispatcher.BroadcastMessage(OpCodeGameState, data, presences, nil, true)
}

// ============================================================
// RPC HANDLERS
// ============================================================

// rpcCreateMatch creates an authoritative Nakama match and returns its id to the frontend.
func rpcCreateMatch(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	matchID, err := nk.MatchCreate(ctx, "tictactoe", map[string]interface{}{})
	if err != nil {
		return "", fmt.Errorf("failed to create match: %w", err)
	}

	response := map[string]string{"match_id": matchID}
	data, _ := json.Marshal(response)
	logger.Info("Created match: %s", matchID)
	return string(data), nil
}

// rpcFindMatch tries to reuse an open match first so "quick play" pairs players together.
func rpcFindMatch(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	// Find matches with available slots
	matches, err := nk.MatchList(ctx, 10, true, "tictactoe", nil, nil, "")
	if err != nil {
		return "", fmt.Errorf("failed to list matches: %w", err)
	}

	// Find a match with 1 player (waiting for opponent)
	for _, match := range matches {
		if match.GetSize() == 1 {
			response := map[string]string{"match_id": match.GetMatchId()}
			data, _ := json.Marshal(response)
			return string(data), nil
		}
	}

	// No available match, create a new one
	matchID, err := nk.MatchCreate(ctx, "tictactoe", map[string]interface{}{})
	if err != nil {
		return "", fmt.Errorf("failed to create match: %w", err)
	}

	response := map[string]interface{}{
		"match_id": matchID,
		"created":  true,
	}
	data, _ := json.Marshal(response)
	return string(data), nil
}

// rpcListMatches is used by the lobby's browse view to show joinable rooms.
func rpcListMatches(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	matches, err := nk.MatchList(ctx, 20, true, "tictactoe", nil, nil, "")
	if err != nil {
		return "", fmt.Errorf("failed to list matches: %w", err)
	}

	type MatchInfo struct {
		MatchID string `json:"match_id"`
		Size    int32  `json:"size"`
	}

	var matchList []MatchInfo
	for _, match := range matches {
		matchList = append(matchList, MatchInfo{
			MatchID: match.GetMatchId(),
			Size:    match.GetSize(),
		})
	}

	response := map[string]interface{}{"matches": matchList}
	data, _ := json.Marshal(response)
	return string(data), nil
}
