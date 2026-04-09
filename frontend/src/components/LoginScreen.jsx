import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useGame";
import nakamaService from "../utils/nakamaService";
import { useDispatch } from "react-redux";
import { setSession, setAccount, setConnected } from "../store/gameSlice";

const ADJECTIVES = [
  "Ninja",
  "Cosmic",
  "Blazing",
  "Shadow",
  "Neon",
  "Quantum",
  "Turbo",
  "Hyper",
];
const NOUNS = [
  "Tiger",
  "Eagle",
  "Wolf",
  "Dragon",
  "Phoenix",
  "Panda",
  "Cobra",
  "Falcon",
];

function randomUsername() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}${Math.floor(Math.random() * 99) + 1}`;
}

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState(randomUsername());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { connectionError } = useAuth();
  const dispatch = useDispatch();

  // Try auto-login with saved session
  useEffect(() => {
    const tryAutoLogin = async () => {
      const saved = localStorage.getItem("nakama_session");
      if (saved) {
        setIsLoading(true);
        try {
          const session = JSON.parse(saved);
          nakamaService.session = session;
          dispatch(setSession(session));
          await nakamaService.loadAccount();
          await nakamaService.connectSocket();
          onLogin();
        } catch (e) {
          localStorage.removeItem("nakama_session");
          setIsLoading(false);
        }
      }
    };
    tryAutoLogin();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      nakamaService.init(dispatch, () => {});
      await nakamaService.authenticateGuest(username.trim());
      await nakamaService.connectSocket();
      onLogin();
    } catch (err) {
      setError(err.message || "Connection failed. Is the server running?");
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated background grid */}
      <div style={styles.bgGrid} />

      {/* Scan line effect */}
      <div style={styles.scanLine} />

      {/* Logo area */}
      <div style={styles.logoArea} className="animate-fade-in">
        <div style={styles.logoSymbols}>
          <span style={styles.symbolX}>X</span>
          <span style={styles.logoVs}>vs</span>
          <span style={styles.symbolO}>O</span>
        </div>
        <h1 style={styles.title}>TACTICAL GRID</h1>
        <p style={styles.subtitle}>Server-Authoritative Tic-Tac-Toe</p>
      </div>

      {/* Login card */}
      <div style={styles.card} className="animate-fade-in">
        <div style={styles.cardHeader}>
          <span style={styles.cardTag}>PLAYER SETUP</span>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>CALLSIGN</label>
            <div style={styles.inputWrapper}>
              <input
                style={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                maxLength={20}
                disabled={isLoading}
                autoFocus
              />
              <button
                type="button"
                style={styles.randomBtn}
                onClick={() => setUsername(randomUsername())}
                disabled={isLoading}
              >
                ↺
              </button>
            </div>
          </div>

          {(error || connectionError) && (
            <div style={styles.errorBox}>
              <span style={styles.errorIcon}>⚠</span>
              {error || connectionError}
            </div>
          )}

          <button
            type="submit"
            style={{ ...styles.loginBtn, opacity: isLoading ? 0.7 : 1 }}
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <span style={styles.loadingContent}>
                <span style={styles.spinner} />
                CONNECTING...
              </span>
            ) : (
              "ENTER THE GRID"
            )}
          </button>
        </form>

        <div style={styles.techNote}>
          <span style={styles.techDot} />
          Powered by Nakama + Go backend
        </div>
      </div>

      {/* Corner decorations */}
      <div style={{ ...styles.corner, top: 20, left: 20 }} />
      <div
        style={{
          ...styles.corner,
          top: 20,
          right: 20,
          transform: "scaleX(-1)",
        }}
      />
      <div
        style={{
          ...styles.corner,
          bottom: 20,
          left: 20,
          transform: "scaleY(-1)",
        }}
      />
      <div
        style={{
          ...styles.corner,
          bottom: 20,
          right: 20,
          transform: "scale(-1)",
        }}
      />
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
    background: "radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0a0a0f 60%)",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    mask: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
  },
  scanLine: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(transparent 50%, rgba(0,245,255,0.015) 50%)",
    backgroundSize: "100% 4px",
    pointerEvents: "none",
  },
  logoArea: {
    textAlign: "center",
    marginBottom: "40px",
    position: "relative",
    zIndex: 1,
  },
  logoSymbols: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "16px",
  },
  symbolX: {
    fontFamily: "var(--font-display)",
    fontSize: "72px",
    color: "var(--x-color)",
    textShadow: "0 0 30px var(--x-glow), 0 0 60px var(--x-glow)",
    lineHeight: 1,
    animation: "pulse-x 2s ease-in-out infinite",
  },
  symbolO: {
    fontFamily: "var(--font-display)",
    fontSize: "72px",
    color: "var(--o-color)",
    textShadow: "0 0 30px var(--o-glow), 0 0 60px var(--o-glow)",
    lineHeight: 1,
    animation: "pulse-o 2s ease-in-out infinite 1s",
  },
  logoVs: {
    fontFamily: "var(--font-mono)",
    fontSize: "18px",
    color: "var(--text-muted)",
    letterSpacing: "4px",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(40px, 8vw, 64px)",
    letterSpacing: "8px",
    background: "linear-gradient(135deg, #fff 0%, #8888cc 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: 1,
    marginBottom: "8px",
  },
  subtitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-muted)",
    letterSpacing: "3px",
    textTransform: "uppercase",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-active)",
    borderRadius: "var(--radius-lg)",
    padding: "32px",
    position: "relative",
    zIndex: 1,
    boxShadow: "0 0 60px rgba(0,245,255,0.05), 0 20px 40px rgba(0,0,0,0.4)",
  },
  cardHeader: {
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  cardTag: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "3px",
    color: "var(--neon-cyan)",
    background: "rgba(0,245,255,0.1)",
    padding: "4px 10px",
    borderRadius: "4px",
    border: "1px solid rgba(0,245,255,0.2)",
  },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "var(--text-muted)",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    background: "var(--bg-void)",
    border: "1px solid var(--border-active)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    color: "var(--text-primary)",
    fontSize: "16px",
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  randomBtn: {
    background: "var(--bg-raised)",
    border: "1px solid var(--border-active)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    color: "var(--text-secondary)",
    fontSize: "18px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  errorBox: {
    background: "rgba(255,70,70,0.1)",
    border: "1px solid rgba(255,70,70,0.3)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#ff6b6b",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "var(--font-mono)",
  },
  errorIcon: { fontSize: "16px" },
  loginBtn: {
    background: "linear-gradient(135deg, var(--neon-cyan), #0080ff)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    color: "#000",
    fontSize: "14px",
    fontFamily: "var(--font-mono)",
    fontWeight: "bold",
    letterSpacing: "3px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 20px rgba(0,245,255,0.3)",
  },
  loadingContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  spinner: {
    width: "14px",
    height: "14px",
    border: "2px solid rgba(0,0,0,0.3)",
    borderTopColor: "#000",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin-slow 0.8s linear infinite",
  },
  techNote: {
    marginTop: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-muted)",
    letterSpacing: "1px",
  },
  techDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "var(--neon-green)",
    boxShadow: "0 0 6px var(--neon-green)",
    animation: "glow-pulse 2s ease-in-out infinite",
  },
  corner: {
    position: "absolute",
    width: "20px",
    height: "20px",
    borderTop: "2px solid var(--neon-cyan)",
    borderLeft: "2px solid var(--neon-cyan)",
    opacity: 0.3,
  },
};
