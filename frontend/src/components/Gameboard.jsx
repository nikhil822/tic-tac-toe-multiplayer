import React, { useCallback } from "react";
import { useGame } from "../hooks/useGame";

// Individual Cell component
function Cell({
  index,
  value,
  onClick,
  isWinning,
  isPending,
  isMyTurn,
  disabled,
}) {
  const isEmpty = !value;

  const getCellStyle = () => ({
    ...styles.cell,
    cursor: isEmpty && isMyTurn && !disabled ? "pointer" : "default",
    background: isWinning
      ? "rgba(255, 214, 0, 0.06)"
      : isPending
        ? "rgba(255,255,255,0.02)"
        : "var(--bg-raised)",
    borderColor: isWinning ? "rgba(255, 214, 0, 0.4)" : "var(--grid-line)",
    boxShadow: isWinning
      ? "0 0 20px rgba(255,214,0,0.15), inset 0 0 20px rgba(255,214,0,0.05)"
      : "none",
    transform: isWinning ? "scale(1.02)" : "scale(1)",
  });

  const getSymbolStyle = (symbol) => {
    if (symbol === "X")
      return {
        ...styles.symbolX,
        animation: "cell-place 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      };
    if (symbol === "O")
      return {
        ...styles.symbolO,
        animation: "cell-place 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      };
    return {};
  };

  return (
    <div
      style={getCellStyle()}
      onClick={isEmpty && isMyTurn && !disabled ? onClick : undefined}
      className={isWinning ? "win-cell" : ""}
    >
      {value ? (
        <span style={getSymbolStyle(value)}>{value}</span>
      ) : (
        isMyTurn &&
        !disabled &&
        isEmpty && <span style={styles.hoverHint}>·</span>
      )}
    </div>
  );
}

// Player info panel
function PlayerPanel({ player, isCurrentTurn, isMe, isWinner, isLoser }) {
  if (!player)
    return (
      <div style={styles.playerPanel}>
        <div style={styles.waitingPlayer}>
          <div style={styles.waitingDots}>
            <span style={{ ...styles.dot, animationDelay: "0s" }} />
            <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
            <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
          </div>
          <div style={styles.waitingText}>WAITING FOR OPPONENT</div>
        </div>
      </div>
    );

  const symbolColor =
    player.symbol === "X" ? "var(--x-color)" : "var(--o-color)";
  const symbolGlow = player.symbol === "X" ? "var(--x-glow)" : "var(--o-glow)";

  return (
    <div
      style={{
        ...styles.playerPanel,
        borderColor: isCurrentTurn ? symbolColor : "var(--border)",
        boxShadow: isCurrentTurn ? `0 0 20px ${symbolGlow}` : "none",
        background: isWinner ? "rgba(255,214,0,0.05)" : "var(--bg-card)",
      }}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <div style={{ ...styles.turnArrow, borderColor: symbolColor }}>
          {isMe ? "▶ YOUR TURN" : "▶ THEIR TURN"}
        </div>
      )}

      <div style={styles.playerPanelInner}>
        <div
          style={{
            ...styles.playerSymbol,
            color: symbolColor,
            textShadow: `0 0 20px ${symbolGlow}`,
          }}
        >
          {player.symbol}
        </div>
        <div style={styles.playerDetails}>
          <div style={styles.playerName}>
            {player.username}
            {isMe && <span style={styles.youBadge}>YOU</span>}
          </div>
          <div style={styles.playerStatus}>
            <span
              style={{
                ...styles.statusDot,
                background: player.is_connected
                  ? "var(--neon-green)"
                  : "#ff4444",
                boxShadow: player.is_connected
                  ? "0 0 6px var(--neon-green)"
                  : "none",
              }}
            />
            {player.is_connected ? "ONLINE" : "DISCONNECTED"}
          </div>
        </div>
        <div style={styles.playerScore}>
          <div style={{ ...styles.scoreNum, color: symbolColor }}>
            {player.score || 0}
          </div>
          <div style={styles.scoreLabel}>WINS</div>
        </div>
      </div>

      {isWinner && <div style={styles.winBanner}>🏆 WINNER</div>}
      {isLoser && <div style={styles.loseBanner}>✗ LOST</div>}
    </div>
  );
}

export default function GameBoard() {
  const {
    board,
    winningLine,
    status,
    winner,
    players,
    currentTurn,
    myPlayer,
    opponent,
    myUserId,
    isMyTurn,
    isWinner,
    isLoser,
    isDraw,
    makeMove,
    requestRematch,
    leaveGame,
    rematchRequested,
    lastMessage,
    error,
    dismissError,
    round,
    mySymbol,
  } = useGame();

  const isGameOver = status === "game_over";
  const isWaiting = status === "waiting";
  const isPlaying = status === "playing";

  const getStatusMessage = () => {
    if (isWaiting) return "WAITING FOR OPPONENT";
    if (isGameOver) {
      if (isDraw) return "IT'S A DRAW!";
      if (isWinner) return "🏆 YOU WIN!";
      return "YOU LOSE";
    }
    if (isMyTurn) return "YOUR TURN";
    return "OPPONENT'S TURN";
  };

  const getStatusColor = () => {
    if (isWaiting) return "var(--text-muted)";
    if (isGameOver) {
      if (isDraw) return "var(--neon-yellow)";
      if (isWinner) return "var(--neon-green)";
      return "#ff4444";
    }
    if (isMyTurn) return mySymbol === "X" ? "var(--x-color)" : "var(--o-color)";
    return "var(--text-muted)";
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgGrid} />

      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={leaveGame}>
          ← LEAVE
        </button>
        <div style={styles.headerCenter}>
          <div style={styles.roundBadge}>ROUND {round}</div>
        </div>
        <div style={styles.matchIdBadge}>
          {mySymbol && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                color: mySymbol === "X" ? "var(--x-color)" : "var(--o-color)",
                fontSize: "20px",
              }}
            >
              {mySymbol}
            </span>
          )}
        </div>
      </header>

      {/* Main game area */}
      <main style={styles.main}>
        {/* Status banner */}
        <div
          style={{
            ...styles.statusBanner,
            borderColor: getStatusColor(),
            color: getStatusColor(),
          }}
        >
          <div
            style={{
              ...styles.statusDotLarge,
              background: getStatusColor(),
              boxShadow: `0 0 10px ${getStatusColor()}`,
            }}
          />
          <span style={styles.statusText}>{getStatusMessage()}</span>
          {lastMessage && lastMessage !== getStatusMessage() && (
            <span style={styles.statusSub}>— {lastMessage}</span>
          )}
        </div>

        {/* Players */}
        <div style={styles.playersRow}>
          <PlayerPanel
            player={myPlayer}
            isCurrentTurn={currentTurn === myUserId && isPlaying}
            isMe={true}
            isWinner={winner === myUserId}
            isLoser={isLoser}
          />
          <div style={styles.vsChip}>VS</div>
          <PlayerPanel
            player={opponent}
            isCurrentTurn={
              opponent && currentTurn === opponent.user_id && isPlaying
            }
            isMe={false}
            isWinner={winner === opponent?.user_id}
            isLoser={false}
          />
        </div>

        {/* Game Board */}
        <div style={styles.boardWrapper}>
          {/* Grid lines */}
          <div style={styles.gridLine1} />
          <div style={styles.gridLine2} />
          <div style={styles.gridLine3} />
          <div style={styles.gridLine4} />

          <div style={styles.board}>
            {board.map((cell, index) => (
              <Cell
                key={index}
                index={index}
                value={cell}
                onClick={() => makeMove(index)}
                isWinning={winningLine?.includes(index)}
                isMyTurn={isMyTurn}
                disabled={isGameOver || isWaiting}
              />
            ))}
          </div>
        </div>

        {/* Game over overlay */}
        {isGameOver && (
          <div style={styles.gameOverPanel} className="animate-fade-in">
            <div style={styles.gameOverTitle}>
              {isDraw ? "DRAW!" : isWinner ? "VICTORY!" : "DEFEAT"}
            </div>
            <div style={styles.gameOverEmoji}>
              {isDraw ? "🤝" : isWinner ? "🏆" : "💀"}
            </div>
            {!isDraw && (
              <div style={styles.gameOverSub}>
                {isWinner
                  ? "You outplayed your opponent!"
                  : "Better luck next time!"}
              </div>
            )}

            <div style={styles.gameOverActions}>
              <button
                style={{
                  ...styles.rematchBtn,
                  opacity: rematchRequested ? 0.6 : 1,
                }}
                onClick={requestRematch}
                disabled={rematchRequested}
              >
                {rematchRequested
                  ? "⏳ WAITING FOR OPPONENT..."
                  : "↺ REQUEST REMATCH"}
              </button>
              <button style={styles.leaveGameBtn} onClick={leaveGame}>
                BACK TO LOBBY
              </button>
            </div>
          </div>
        )}

        {/* Waiting spinner */}
        {isWaiting && (
          <div style={styles.waitingPanel} className="animate-fade-in">
            <div style={styles.waitingSpinner} />
            <div style={styles.waitingInfo}>
              <div style={styles.waitingTitle}>ROOM CREATED</div>
              <div style={styles.waitingSubtitle}>
                Share this match to invite someone
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Error toast */}
      {error && (
        <div
          style={styles.errorToast}
          onClick={dismissError}
          className="animate-fade-in"
        >
          <span style={styles.errorIcon}>⚠</span>
          {error}
          <span style={styles.errorClose}>×</span>
        </div>
      )}
    </div>
  );
}

const BOARD_SIZE = "min(340px, 92vw)";

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "radial-gradient(ellipse at 50% 30%, #0d0a1e 0%, #0a0a0f 70%)",
    position: "relative",
    overflow: "hidden",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border)",
    background: "rgba(10,10,15,0.8)",
    backdropFilter: "blur(10px)",
    position: "relative",
    zIndex: 1,
  },
  backBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "8px 14px",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    letterSpacing: "2px",
    cursor: "pointer",
  },
  headerCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  roundBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    letterSpacing: "3px",
    color: "var(--text-muted)",
    background: "var(--bg-raised)",
    padding: "4px 12px",
    borderRadius: "20px",
    border: "1px solid var(--border)",
  },
  matchIdBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: "60px",
    justifyContent: "flex-end",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 20px 32px",
    gap: "20px",
    position: "relative",
    zIndex: 1,
  },
  statusBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 20px",
    borderRadius: "100px",
    border: "1px solid",
    background: "var(--bg-raised)",
    maxWidth: "100%",
  },
  statusDotLarge: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusText: {
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    letterSpacing: "2px",
    fontWeight: "bold",
  },
  statusSub: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-muted)",
    letterSpacing: "1px",
  },
  playersRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    maxWidth: "500px",
  },
  vsChip: {
    fontFamily: "var(--font-display)",
    fontSize: "18px",
    letterSpacing: "3px",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  playerPanel: {
    flex: 1,
    background: "var(--bg-card)",
    border: "1px solid",
    borderRadius: "var(--radius-md)",
    padding: "12px 16px",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
    minHeight: "70px",
  },
  turnArrow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: "3px 8px",
    border: "0 0 1px 0",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    fontFamily: "var(--font-mono)",
    fontSize: "8px",
    letterSpacing: "2px",
    textAlign: "center",
    background: "rgba(255,255,255,0.03)",
    color: "inherit",
  },
  playerPanelInner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingTop: "16px",
  },
  playerSymbol: {
    fontFamily: "var(--font-display)",
    fontSize: "40px",
    lineHeight: 1,
  },
  playerDetails: { flex: 1, minWidth: 0 },
  playerName: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  youBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "8px",
    letterSpacing: "1px",
    background: "var(--neon-cyan)",
    color: "#000",
    padding: "1px 5px",
    borderRadius: "3px",
  },
  playerStatus: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    letterSpacing: "1px",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
  statusDot: { width: "6px", height: "6px", borderRadius: "50%" },
  playerScore: { textAlign: "center" },
  scoreNum: {
    fontFamily: "var(--font-display)",
    fontSize: "28px",
    lineHeight: 1,
  },
  scoreLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "8px",
    letterSpacing: "1px",
    color: "var(--text-muted)",
  },
  winBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "4px",
    textAlign: "center",
    background: "rgba(255,214,0,0.15)",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "var(--neon-yellow)",
    borderTop: "1px solid rgba(255,214,0,0.3)",
  },
  loseBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "4px",
    textAlign: "center",
    background: "rgba(255,68,68,0.1)",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "#ff4444",
    borderTop: "1px solid rgba(255,68,68,0.2)",
  },
  waitingPlayer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "70px",
    gap: "8px",
  },
  waitingDots: { display: "flex", gap: "4px" },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "var(--text-muted)",
    animation: "blink 1.2s ease-in-out infinite",
  },
  waitingText: {
    fontFamily: "var(--font-mono)",
    fontSize: "8px",
    letterSpacing: "2px",
    color: "var(--text-muted)",
  },

  // Board
  boardWrapper: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: "relative",
    flexShrink: 0,
  },
  board: {
    width: "100%",
    height: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(3, 1fr)",
    gap: "6px",
  },
  gridLine1: {
    position: "absolute",
    left: "calc(33.33% + 2px)",
    top: 0,
    bottom: 0,
    width: "1px",
    background: "var(--grid-line)",
    pointerEvents: "none",
  },
  gridLine2: {
    position: "absolute",
    left: "calc(66.66% + 3px)",
    top: 0,
    bottom: 0,
    width: "1px",
    background: "var(--grid-line)",
    pointerEvents: "none",
  },
  gridLine3: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(33.33% + 2px)",
    height: "1px",
    background: "var(--grid-line)",
    pointerEvents: "none",
  },
  gridLine4: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(66.66% + 3px)",
    height: "1px",
    background: "var(--grid-line)",
    pointerEvents: "none",
  },

  cell: {
    background: "var(--bg-raised)",
    borderRadius: "12px",
    border: "1px solid var(--grid-line)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    position: "relative",
    overflow: "hidden",
  },
  symbolX: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(50px, 12vw, 90px)",
    color: "var(--x-color)",
    textShadow: "0 0 20px var(--x-glow), 0 0 40px var(--x-glow)",
    lineHeight: 1,
    display: "block",
  },
  symbolO: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(50px, 12vw, 90px)",
    color: "var(--o-color)",
    textShadow: "0 0 20px var(--o-glow), 0 0 40px var(--o-glow)",
    lineHeight: 1,
    display: "block",
  },
  hoverHint: {
    fontFamily: "var(--font-display)",
    fontSize: "40px",
    color: "rgba(255,255,255,0.05)",
  },

  // Game over
  gameOverPanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-active)",
    borderRadius: "var(--radius-lg)",
    padding: "28px",
    textAlign: "center",
    width: "100%",
    maxWidth: "380px",
    boxShadow: "0 0 60px rgba(0,0,0,0.4)",
  },
  gameOverTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "48px",
    letterSpacing: "6px",
    background: "linear-gradient(135deg, #fff 0%, #aaa 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "8px",
  },
  gameOverEmoji: { fontSize: "48px", marginBottom: "8px" },
  gameOverSub: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    color: "var(--text-muted)",
    marginBottom: "24px",
  },
  gameOverActions: { display: "flex", flexDirection: "column", gap: "10px" },
  rematchBtn: {
    background: "linear-gradient(135deg, var(--neon-cyan), #0080ff)",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    color: "#fff",
    fontSize: "13px",
    fontFamily: "var(--font-mono)",
    fontWeight: "bold",
    letterSpacing: "2px",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0,180,255,0.25)",
  },
  leaveGameBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "12px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
    letterSpacing: "2px",
    cursor: "pointer",
  },

  // Waiting
  waitingPanel: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "16px 24px",
  },
  waitingSpinner: {
    width: "24px",
    height: "24px",
    border: "2px solid var(--border)",
    borderTopColor: "var(--neon-cyan)",
    borderRadius: "50%",
    animation: "spin-slow 1s linear infinite",
    flexShrink: 0,
  },
  waitingInfo: {},
  waitingTitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    letterSpacing: "2px",
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  waitingSubtitle: {
    fontFamily: "var(--font-body)",
    fontSize: "12px",
    color: "var(--text-muted)",
  },

  // Error toast
  errorToast: {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(30,10,10,0.95)",
    border: "1px solid rgba(255,70,70,0.4)",
    borderRadius: "10px",
    padding: "12px 20px",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    color: "#ff6b6b",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px rgba(255,70,70,0.2)",
    whiteSpace: "nowrap",
  },
  errorIcon: { fontSize: "14px" },
  errorClose: { marginLeft: "8px", opacity: 0.6, fontSize: "16px" },
};
