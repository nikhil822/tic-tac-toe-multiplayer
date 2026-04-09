import React, { useEffect, useState } from "react";
import { useMatchmaking, useAuth } from "../hooks/useGame";

export default function LobbyScreen() {
  const {
    findMatch,
    createMatch,
    joinMatch,
    listMatches,
    isSearching,
    matchList,
  } = useMatchmaking();
  const { username, userId } = useAuth();
  const [matches, setMatches] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("quick"); // 'quick' | 'browse'

  useEffect(() => {
    if (tab === "browse") refreshMatchList();
  }, [tab]);

  const refreshMatchList = async () => {
    setRefreshing(true);
    const list = await listMatches();
    setMatches(list || []);
    setRefreshing(false);
  };

  const handleQuickMatch = async () => {
    try {
      await findMatch();
    } catch (e) {
      /* handled in service */
    }
  };

  const handleCreatePrivate = async () => {
    try {
      await createMatch();
    } catch (e) {
      /* handled in service */
    }
  };

  const handleJoinMatch = async (matchId) => {
    try {
      await joinMatch(matchId);
    } catch (e) {
      /* handled in service */
    }
  };

  return (
    <div style={styles.container}>
      {/* Background */}
      <div style={styles.bgGrid} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoSmall}>
            <span style={styles.xSmall}>X</span>
            <span style={styles.oSmall}>O</span>
          </div>
          <div>
            <div style={styles.appName}>TACTICAL GRID</div>
            <div style={styles.serverBadge}>
              <span style={styles.dot} />
              NAKAMA ONLINE
            </div>
          </div>
        </div>
        <div style={styles.playerBadge}>
          <div style={styles.playerAvatar}>
            {username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={styles.playerName}>{username || "Player"}</div>
            <div style={styles.playerId}>{userId?.slice(0, 8)}...</div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        {/* Tab nav */}
        <div style={styles.tabNav}>
          <button
            style={{
              ...styles.tab,
              ...(tab === "quick" ? styles.tabActive : {}),
            }}
            onClick={() => setTab("quick")}
          >
            QUICK PLAY
          </button>
          <button
            style={{
              ...styles.tab,
              ...(tab === "browse" ? styles.tabActive : {}),
            }}
            onClick={() => setTab("browse")}
          >
            BROWSE ROOMS
          </button>
        </div>

        {tab === "quick" ? (
          <div style={styles.quickPlay} className="animate-fade-in">
            {/* Main CTA */}
            <div style={styles.ctaCard}>
              <div style={styles.ctaSymbols}>
                <span style={styles.ctaX}>X</span>
                <div style={styles.ctaCenter}>
                  <div style={styles.ctaVs}>VS</div>
                  <div style={styles.ctaDesc}>AUTO-MATCH WITH OPPONENT</div>
                </div>
                <span style={styles.ctaO}>O</span>
              </div>

              <button
                style={{ ...styles.primaryBtn, opacity: isSearching ? 0.7 : 1 }}
                onClick={handleQuickMatch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <span style={styles.searchingContent}>
                    <span style={styles.searchSpinner} />
                    SEARCHING FOR OPPONENT...
                  </span>
                ) : (
                  "⚡ FIND MATCH"
                )}
              </button>

              {isSearching && (
                <div style={styles.searchingBar}>
                  <div style={styles.searchingFill} />
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>OR</span>
              <div style={styles.dividerLine} />
            </div>

            {/* Private match */}
            <button
              style={styles.secondaryBtn}
              onClick={handleCreatePrivate}
              disabled={isSearching}
            >
              + CREATE PRIVATE ROOM
            </button>

            {/* Stats row */}
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <div style={styles.statValue}>∞</div>
                <div style={styles.statLabel}>ROOMS AVAILABLE</div>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <div style={styles.statValue}>~1s</div>
                <div style={styles.statLabel}>AVG MATCHTIME</div>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <div style={styles.statValue}>2P</div>
                <div style={styles.statLabel}>PER MATCH</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.browsePanelWrap} className="animate-fade-in">
            <div style={styles.browsePanel}>
              <div style={styles.browseHeader}>
                <span style={styles.roomCount}>
                  {matches.length} ROOMS FOUND
                </span>
                <button
                  style={styles.refreshBtn}
                  onClick={refreshMatchList}
                  disabled={refreshing}
                >
                  {refreshing ? "..." : "↺ REFRESH"}
                </button>
              </div>

              {matches.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>◻</div>
                  <div style={styles.emptyText}>NO OPEN ROOMS</div>
                  <div style={styles.emptySubtext}>
                    Create one or use Quick Play
                  </div>
                </div>
              ) : (
                <div style={styles.matchList}>
                  {matches.map((match, i) => (
                    <div key={match.match_id || i} style={styles.matchItem}>
                      <div style={styles.matchInfo}>
                        <div style={styles.matchId}>
                          {match.match_id?.slice(0, 16)}...
                        </div>
                        <div style={styles.matchPlayers}>
                          <span
                            style={{
                              ...styles.playerDot,
                              background:
                                match.size >= 1
                                  ? "var(--neon-green)"
                                  : "var(--text-muted)",
                            }}
                          />
                          <span
                            style={{
                              ...styles.playerDot,
                              background:
                                match.size >= 2
                                  ? "var(--neon-green)"
                                  : "var(--text-muted)",
                            }}
                          />
                          <span style={styles.matchSize}>
                            {match.size}/2 players
                          </span>
                        </div>
                      </div>
                      <button
                        style={{
                          ...styles.joinBtn,
                          opacity: match.size >= 2 ? 0.4 : 1,
                        }}
                        onClick={() => handleJoinMatch(match.match_id)}
                        disabled={match.size >= 2 || isSearching}
                      >
                        {match.size >= 2 ? "FULL" : "JOIN →"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>
          NAKAMA SERVER-AUTHORITATIVE ARCHITECTURE
        </span>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "radial-gradient(ellipse at 50% -20%, #0d0d2b 0%, #0a0a0f 60%)",
    position: "relative",
    overflow: "hidden",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
    backgroundSize: "50px 50px",
    mask: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%)",
    pointerEvents: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border)",
    backdropFilter: "blur(10px)",
    background: "rgba(10,10,15,0.6)",
    position: "relative",
    zIndex: 1,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "14px" },
  logoSmall: { display: "flex", gap: "4px", alignItems: "center" },
  xSmall: {
    fontFamily: "var(--font-display)",
    fontSize: "28px",
    color: "var(--x-color)",
    textShadow: "0 0 15px var(--x-glow)",
    lineHeight: 1,
  },
  oSmall: {
    fontFamily: "var(--font-display)",
    fontSize: "28px",
    color: "var(--o-color)",
    textShadow: "0 0 15px var(--o-glow)",
    lineHeight: 1,
  },
  appName: {
    fontFamily: "var(--font-display)",
    fontSize: "18px",
    letterSpacing: "4px",
    color: "var(--text-primary)",
  },
  serverBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    letterSpacing: "2px",
    color: "var(--neon-green)",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "var(--neon-green)",
    boxShadow: "0 0 6px var(--neon-green)",
    animation: "glow-pulse 2s infinite",
  },
  playerBadge: { display: "flex", alignItems: "center", gap: "12px" },
  playerAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--neon-cyan), #0060ff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontSize: "20px",
    color: "#000",
    fontWeight: "bold",
  },
  playerName: {
    fontFamily: "var(--font-body)",
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  playerId: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    color: "var(--text-muted)",
    letterSpacing: "1px",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 24px",
    position: "relative",
    zIndex: 1,
  },
  tabNav: {
    display: "flex",
    gap: "4px",
    marginBottom: "32px",
    background: "var(--bg-surface)",
    padding: "4px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
  },
  tab: {
    padding: "10px 24px",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    letterSpacing: "2px",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabActive: {
    background: "var(--bg-raised)",
    color: "var(--text-primary)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  quickPlay: {
    width: "100%",
    maxWidth: "440px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  ctaCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-active)",
    borderRadius: "var(--radius-lg)",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    boxShadow: "0 0 40px rgba(0,245,255,0.04)",
  },
  ctaSymbols: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  ctaX: {
    fontFamily: "var(--font-display)",
    fontSize: "80px",
    color: "var(--x-color)",
    textShadow: "0 0 40px var(--x-glow)",
    lineHeight: 1,
  },
  ctaO: {
    fontFamily: "var(--font-display)",
    fontSize: "80px",
    color: "var(--o-color)",
    textShadow: "0 0 40px var(--o-glow)",
    lineHeight: 1,
  },
  ctaCenter: { flex: 1, textAlign: "center" },
  ctaVs: {
    fontFamily: "var(--font-display)",
    fontSize: "36px",
    letterSpacing: "6px",
    color: "var(--text-muted)",
    marginBottom: "8px",
  },
  ctaDesc: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    letterSpacing: "2px",
    color: "var(--text-muted)",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #00c8ff, #0080ff)",
    border: "none",
    borderRadius: "10px",
    padding: "18px",
    color: "#fff",
    fontSize: "14px",
    fontFamily: "var(--font-mono)",
    fontWeight: "bold",
    letterSpacing: "3px",
    cursor: "pointer",
    boxShadow: "0 4px 24px rgba(0,180,255,0.35)",
    transition: "all 0.2s",
  },
  searchingContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },
  searchSpinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin-slow 0.8s linear infinite",
  },
  searchingBar: {
    height: "3px",
    background: "var(--bg-void)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  searchingFill: {
    height: "100%",
    background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-pink))",
    animation: "loading-bar 2s ease-in-out infinite alternate",
    width: "60%",
  },
  divider: { display: "flex", alignItems: "center", gap: "12px" },
  dividerLine: { flex: 1, height: "1px", background: "var(--border)" },
  dividerText: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-muted)",
    letterSpacing: "2px",
  },
  secondaryBtn: {
    background: "transparent",
    border: "1px solid var(--border-active)",
    borderRadius: "10px",
    padding: "16px",
    color: "var(--text-secondary)",
    fontSize: "13px",
    fontFamily: "var(--font-mono)",
    letterSpacing: "2px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  statsRow: {
    display: "flex",
    justifyContent: "center",
    gap: "0",
    background: "var(--bg-surface)",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    overflow: "hidden",
    marginTop: "8px",
  },
  statItem: { flex: 1, padding: "16px 12px", textAlign: "center" },
  statValue: {
    fontFamily: "var(--font-display)",
    fontSize: "24px",
    color: "var(--neon-cyan)",
    marginBottom: "4px",
  },
  statLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "8px",
    letterSpacing: "1px",
    color: "var(--text-muted)",
  },
  statDivider: {
    width: "1px",
    background: "var(--border)",
    alignSelf: "stretch",
  },
  browsePanelWrap: { width: "100%", maxWidth: "500px" },
  browsePanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-active)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  browseHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-raised)",
  },
  roomCount: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    letterSpacing: "2px",
    color: "var(--text-muted)",
  },
  refreshBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "6px 12px",
    color: "var(--text-secondary)",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    letterSpacing: "1px",
  },
  emptyState: { padding: "60px 20px", textAlign: "center" },
  emptyIcon: {
    fontSize: "48px",
    color: "var(--text-muted)",
    marginBottom: "16px",
  },
  emptyText: {
    fontFamily: "var(--font-display)",
    fontSize: "20px",
    letterSpacing: "4px",
    color: "var(--text-muted)",
    marginBottom: "8px",
  },
  emptySubtext: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    color: "var(--text-muted)",
  },
  matchList: { padding: "8px" },
  matchItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderRadius: "10px",
    marginBottom: "4px",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    transition: "all 0.2s",
  },
  matchInfo: { flex: 1 },
  matchId: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-secondary)",
    marginBottom: "4px",
  },
  matchPlayers: { display: "flex", alignItems: "center", gap: "6px" },
  playerDot: { width: "8px", height: "8px", borderRadius: "50%" },
  matchSize: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-muted)",
    letterSpacing: "1px",
    marginLeft: "4px",
  },
  joinBtn: {
    background: "linear-gradient(135deg, var(--neon-green), #00cc66)",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    color: "#000",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    fontWeight: "bold",
    letterSpacing: "2px",
    cursor: "pointer",
  },
  footer: {
    padding: "16px",
    textAlign: "center",
    borderTop: "1px solid var(--border)",
    background: "rgba(10,10,15,0.6)",
  },
  footerText: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    letterSpacing: "3px",
    color: "var(--text-muted)",
  },
};
