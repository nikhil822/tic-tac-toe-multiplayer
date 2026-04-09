import { createSlice } from '@reduxjs/toolkit';

// The Redux slice mirrors the last authoritative game state broadcast by Nakama.
// Local-only fields such as pendingMove help the UI feel responsive between socket updates.
const initialState = {
  // Auth
  session: null,
  account: null,

  // Connection
  socket: null,
  isConnected: false,
  connectionError: null,

  // Match
  matchId: null,
  matchList: [],
  isSearching: false,

  // Game state (mirrors server)
  board: Array(9).fill(''),
  currentTurn: null,
  status: 'idle', // idle | waiting | playing | game_over
  winner: null,
  winningLine: [],
  players: [],
  moveCount: 0,
  round: 1,

  // UI
  lastMessage: '',
  error: null,
  pendingMove: null,
  rematchRequested: false,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setSession(state, action) {
      state.session = action.payload;
    },
    setAccount(state, action) {
      state.account = action.payload;
    },
    setConnected(state, action) {
      state.isConnected = action.payload;
      if (action.payload) state.connectionError = null;
    },
    setConnectionError(state, action) {
      state.connectionError = action.payload;
      state.isConnected = false;
    },
    setMatchId(state, action) {
      state.matchId = action.payload;
    },
    setMatchList(state, action) {
      state.matchList = action.payload;
    },
    setSearching(state, action) {
      state.isSearching = action.payload;
    },
    updateGameState(state, action) {
      // The backend sends the full game snapshot, so reducers mostly replace fields directly.
      const gs = action.payload.game_state;
      state.board = gs.board || Array(9).fill('');
      state.currentTurn = gs.current_turn;
      state.status = gs.status;
      state.winner = gs.winner || null;
      state.winningLine = gs.winning_line || [];
      state.players = gs.players || [];
      state.moveCount = gs.move_count || 0;
      state.round = gs.round || 1;
      if (gs.match_id) state.matchId = gs.match_id;
      state.lastMessage = action.payload.message || '';
      state.pendingMove = null;
    },
    setPendingMove(state, action) {
      state.pendingMove = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    setRematchRequested(state, action) {
      state.rematchRequested = action.payload;
    },
    resetMatch(state) {
      // Reset only match-specific UI state and keep auth/session data intact.
      state.matchId = null;
      state.board = Array(9).fill('');
      state.currentTurn = null;
      state.status = 'idle';
      state.winner = null;
      state.winningLine = [];
      state.players = [];
      state.moveCount = 0;
      state.round = 1;
      state.lastMessage = '';
      state.pendingMove = null;
      state.rematchRequested = false;
      state.isSearching = false;
    },
  },
});

export const {
  setSession, setAccount, setConnected, setConnectionError,
  setMatchId, setMatchList, setSearching, updateGameState,
  setPendingMove, setError, clearError, setRematchRequested, resetMatch,
} = gameSlice.actions;

export default gameSlice.reducer;
