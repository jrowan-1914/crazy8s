"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";

interface TeamScore {
  teamId: string;
  teamName: string;
  seed: number;
  region: string;
  logoUrl: string | null;
  eliminated: boolean;
  wins: number;
  points: number;
  winsByRound?: number[];
}

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  totalPoints: number;
  teams: TeamScore[];
  pointsByRound: Record<string, number>;
}

interface PopularTeam {
  teamId: string;
  teamName: string;
  seed: number;
  region: string;
  logoUrl: string | null;
  eliminated: boolean;
  pickedBy: number;
  totalPlayers: number;
  percentage: number;
  playerNames: string[];
}

interface PopularPicksData {
  teams: PopularTeam[];
}

interface HeadToHeadData {
  player1: {
    playerId: string;
    playerName: string;
    totalPoints: number;
    teams: TeamScore[];
  };
  player2: {
    playerId: string;
    playerName: string;
    totalPoints: number;
    teams: TeamScore[];
  };
  sharedTeams: string[];
  uniqueToPlayer1: string[];
  uniqueToPlayer2: string[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function rankBadgeStyle(rank: number) {
  if (rank === 1)
    return "bg-[var(--accent-gold)] text-[var(--bg-primary)] shadow-[0_0_12px_var(--accent-gold-glow)]";
  if (rank === 2)
    return "bg-[#a8b4c4] text-[var(--bg-primary)]";
  if (rank === 3)
    return "bg-[#cd7f32] text-[var(--bg-primary)]";
  return "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]";
}

// --- Feature 1: Points Trend Sparkline ---
function PointsSparkline({ pointsByRound }: { pointsByRound: Record<string, number> }) {
  const rounds = [1, 2, 3, 4, 5, 6];
  let cumulative = 0;
  const dataPoints: { round: number; value: number }[] = [];

  for (const r of rounds) {
    const pts = pointsByRound[String(r)] || 0;
    cumulative += pts;
    if (cumulative > 0 || dataPoints.length > 0) {
      dataPoints.push({ round: r, value: cumulative });
    }
  }

  if (dataPoints.length === 0) return null;

  const width = 80;
  const height = 24;
  const padding = 4;
  const maxVal = Math.max(...dataPoints.map((d) => d.value), 1);
  const minVal = 0;

  const points = dataPoints.map((d, i) => {
    const x = dataPoints.length === 1
      ? width / 2
      : padding + (i / (dataPoints.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (d.value - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
    return { x, y };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block ml-2 align-middle"
      style={{ flexShrink: 0 }}
    >
      <path
        d={pathD}
        fill="none"
        stroke="var(--accent-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2"
          fill="var(--accent-gold)"
        />
      ))}
    </svg>
  );
}

// --- Feature 2: Still In The Hunt ---
function StillInTheHunt({ teams }: { teams: TeamScore[] }) {
  const activeTeams = teams.filter((t) => !t.eliminated);
  if (activeTeams.length === 0) {
    return (
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <span className="text-xs font-semibold text-[var(--danger)]">
          All teams eliminated
        </span>
      </div>
    );
  }

  return (
    <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--success)] text-[var(--bg-primary)]">
          {activeTeams.length} team{activeTeams.length !== 1 ? "s" : ""} still active
        </span>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-[var(--text-muted)] mr-1">Rooting for:</span>
        {activeTeams.map((team) => (
          <span
            key={team.teamId}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)]"
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt="" className="w-4 h-4 object-contain" />
            ) : (
              <span className="text-[var(--text-muted)]">({team.seed})</span>
            )}
            {team.teamName}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Feature 3: Head-to-Head Compare Panel ---
function HeadToHeadPanel({
  player1Id,
  player2Id,
  leaderboard,
  onClose,
}: {
  player1Id: string;
  player2Id: string;
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
}) {
  const [h2hData, setH2hData] = useState<HeadToHeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/stats/head-to-head?p1=${player1Id}&p2=${player2Id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setH2hData(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: build comparison from leaderboard data
        const p1 = leaderboard.find((e) => e.playerId === player1Id);
        const p2 = leaderboard.find((e) => e.playerId === player2Id);
        if (p1 && p2) {
          const p1TeamIds = new Set(p1.teams.map((t) => t.teamId));
          const p2TeamIds = new Set(p2.teams.map((t) => t.teamId));
          const shared = [...p1TeamIds].filter((id) => p2TeamIds.has(id));
          const uniqueP1 = [...p1TeamIds].filter((id) => !p2TeamIds.has(id));
          const uniqueP2 = [...p2TeamIds].filter((id) => !p1TeamIds.has(id));
          setH2hData({
            player1: { playerId: p1.playerId, playerName: p1.playerName, totalPoints: p1.totalPoints, teams: p1.teams },
            player2: { playerId: p2.playerId, playerName: p2.playerName, totalPoints: p2.totalPoints, teams: p2.teams },
            sharedTeams: shared,
            uniqueToPlayer1: uniqueP1,
            uniqueToPlayer2: uniqueP2,
          });
        }
        setError(false);
        setLoading(false);
      });
  }, [player1Id, player2Id, leaderboard]);

  if (loading) {
    return (
      <div className="surface-card p-6 text-center">
        <p className="text-[var(--text-muted)]">Loading comparison...</p>
      </div>
    );
  }

  if (!h2hData) {
    return (
      <div className="surface-card p-6 text-center">
        <p className="text-[var(--danger)]">Could not load comparison data.</p>
        <button onClick={onClose} className="text-sm text-[var(--text-muted)] mt-2 underline">
          Close
        </button>
      </div>
    );
  }

  const { player1: p1, player2: p2, sharedTeams, uniqueToPlayer1, uniqueToPlayer2 } = h2hData;
  const diff = p1.totalPoints - p2.totalPoints;

  const renderTeamPill = (team: TeamScore, highlight?: "shared" | "unique") => (
    <div
      key={team.teamId}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
        highlight === "shared"
          ? "bg-[var(--accent-gold-glow)] border border-[var(--accent-gold)]"
          : "bg-[var(--bg-elevated)] border border-[var(--border)]"
      } ${team.eliminated ? "opacity-40" : ""}`}
    >
      {team.logoUrl ? (
        <img src={team.logoUrl} alt="" className="w-5 h-5 object-contain" />
      ) : (
        <span className="text-[var(--text-muted)]">({team.seed})</span>
      )}
      <span className="text-[var(--text-primary)]">{team.teamName}</span>
      <span className="text-[var(--text-muted)] ml-auto">{team.points}pts</span>
    </div>
  );

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <h3 className="font-display text-lg gold-text" style={{ fontWeight: 700 }}>
          Head-to-Head
        </h3>
        <button
          onClick={onClose}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Close
        </button>
      </div>

      {/* Score comparison */}
      <div className="grid grid-cols-2 gap-0 border-b border-[var(--border)]">
        <div className={`p-4 text-center ${diff >= 0 ? "border-b-2 border-[var(--accent-gold)]" : ""}`}>
          <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{p1.playerName}</p>
          <p className="scoreboard-num text-3xl text-[var(--accent-gold)] mt-1">{p1.totalPoints}</p>
          <p className="text-xs text-[var(--text-muted)]">points</p>
        </div>
        <div className={`p-4 text-center border-l border-[var(--border)] ${diff <= 0 ? "border-b-2 border-[var(--accent-gold)]" : ""}`}>
          <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{p2.playerName}</p>
          <p className="scoreboard-num text-3xl text-[var(--accent-gold)] mt-1">{p2.totalPoints}</p>
          <p className="text-xs text-[var(--text-muted)]">points</p>
        </div>
      </div>

      {/* Margin */}
      <div className="px-5 py-2 text-center bg-[var(--bg-surface)]">
        {diff === 0 ? (
          <span className="text-sm font-semibold text-[var(--text-muted)]">Tied!</span>
        ) : (
          <span className="text-sm font-semibold text-[var(--success)]">
            {diff > 0 ? p1.playerName : p2.playerName} leads by {Math.abs(diff)} pt{Math.abs(diff) !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Shared teams */}
      {sharedTeams.length > 0 && (
        <div className="px-5 py-3 border-t border-[var(--border)]">
          <p className="text-xs font-semibold text-[var(--accent-gold)] mb-2">
            Shared Teams ({sharedTeams.length})
          </p>
          <div className="space-y-1">
            {p1.teams
              .filter((t) => sharedTeams.includes(t.teamId))
              .map((t) => renderTeamPill(t, "shared"))}
          </div>
        </div>
      )}

      {/* Unique teams */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-[var(--border)]">
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
            Only {p1.playerName} ({uniqueToPlayer1.length})
          </p>
          <div className="space-y-1">
            {p1.teams
              .filter((t) => uniqueToPlayer1.includes(t.teamId))
              .map((t) => renderTeamPill(t, "unique"))}
          </div>
        </div>
        <div className="px-5 py-3 border-t sm:border-t-0 sm:border-l border-[var(--border)]">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
            Only {p2.playerName} ({uniqueToPlayer2.length})
          </p>
          <div className="space-y-1">
            {p2.teams
              .filter((t) => uniqueToPlayer2.includes(t.teamId))
              .map((t) => renderTeamPill(t, "unique"))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Smack Talk Chat ---
interface ChatMessageData {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SmackTalk() {
  const { data, mutate } = useSWR<{ messages: ChatMessageData[] }>(
    "/api/chat",
    fetcher,
    { refreshInterval: 10000 }
  );
  const [author, setAuthor] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smacktalk-author") || "";
    }
    return "";
  });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollTop = node.scrollHeight;
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !message.trim() || sending) return;

    setSending(true);
    try {
      localStorage.setItem("smacktalk-author", author.trim());
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: author.trim(), message: message.trim() }),
      });
      setMessage("");
      mutate();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <h2 className="font-display text-xl gold-text" style={{ fontWeight: 700 }}>
          SMACK TALK
        </h2>
      </div>

      {/* Messages */}
      <div
        ref={messagesEndRef}
        className="overflow-y-auto px-5 py-3 space-y-3"
        style={{ maxHeight: "300px" }}
      >
        {!data?.messages || data.messages.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No smack talk yet. Be the first to start talking trash!
          </p>
        ) : (
          data.messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm text-[var(--accent-gold)]">
                    {msg.author}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)] mt-0.5 break-words">
                  {msg.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSend}
        className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-surface)]"
      >
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Your name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={30}
            className="w-28 flex-shrink-0 px-3 py-2 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
          />
          <input
            type="text"
            placeholder="Talk your trash..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
          />
          <button
            type="submit"
            disabled={sending || !author.trim() || !message.trim()}
            className="btn-gold px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Feature 4: Most Popular Picks ---
function MostPopularPicks() {
  const { data, isLoading } = useSWR<PopularPicksData>(
    "/api/stats/popular-picks",
    fetcher
  );

  if (isLoading) {
    return (
      <div className="surface-card p-6 text-center">
        <p className="text-[var(--text-muted)] text-sm">Loading popular picks...</p>
      </div>
    );
  }

  if (!data || !data.teams || data.teams.length === 0) return null;

  const sorted = [...data.teams].sort((a, b) => b.percentage - a.percentage);
  const topPicks = sorted.slice(0, 8);
  const sleeperPicks = sorted.filter((t) => t.pickedBy === 1).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top picks */}
      <div>
        <h2 className="font-display text-xl gold-text mb-4" style={{ fontWeight: 700 }}>
          Most Popular Picks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topPicks.map((team) => {
            const isHighPct = team.percentage >= 50;
            return (
              <div
                key={team.teamId}
                className={`surface-card p-4 flex items-center gap-3 ${
                  isHighPct ? "border-[var(--accent-gold)]" : ""
                }`}
              >
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.teamName} className="w-10 h-10 object-contain flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-sm text-[var(--text-muted)] flex-shrink-0">
                    {team.seed}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                      {team.teamName}
                    </p>
                    <span className="text-xs text-[var(--text-muted)] flex-shrink-0">#{team.seed}</span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isHighPct ? "text-[var(--accent-gold)]" : "text-[var(--text-muted)]"}`}>
                    Picked by {team.pickedBy}/{team.totalPlayers} players ({team.percentage}%)
                  </p>
                  {/* Percentage bar */}
                  <div className="mt-1.5 h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${team.percentage}%`,
                        backgroundColor: isHighPct ? "var(--accent-gold)" : "var(--border-hover)",
                      }}
                    />
                  </div>
                </div>
                {team.eliminated && (
                  <span className="text-xs text-[var(--danger)] flex-shrink-0">OUT</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sleeper picks */}
      {sleeperPicks.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-[var(--text-primary)] mb-3" style={{ fontWeight: 600 }}>
            Sleeper Picks
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Teams picked by only one player — bold strategy.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sleeperPicks.map((team) => (
              <div
                key={team.teamId}
                className="elevated-card p-3 flex items-center gap-2"
              >
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.teamName} className="w-8 h-8 object-contain flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text-muted)] flex-shrink-0">
                    {team.seed}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                    {team.teamName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    #{team.seed} {team.region} — picked by {team.playerNames?.[0] || "1 player"}
                  </p>
                </div>
                {team.eliminated && (
                  <span className="text-xs text-[var(--danger)] flex-shrink-0">OUT</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Leaderboard Page ---
export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useSWR<LeaderboardEntry[]>(
    "/api/leaderboard",
    fetcher,
    { refreshInterval: 30000 }
  );
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => {
      if (!prev) {
        setCompareSelection([]);
      }
      return !prev;
    });
  }, []);

  const handlePlayerClick = useCallback(
    (playerId: string) => {
      if (compareMode) {
        setCompareSelection((prev) => {
          if (prev.includes(playerId)) {
            return prev.filter((id) => id !== playerId);
          }
          if (prev.length < 2) {
            return [...prev, playerId];
          }
          // Replace the second selection
          return [prev[0], playerId];
        });
      } else {
        setExpandedPlayer((prev) => (prev === playerId ? null : playerId));
      }
    },
    [compareMode]
  );

  const closeCompare = useCallback(() => {
    setCompareSelection([]);
    setCompareMode(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-[var(--text-muted)]">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl gold-text" style={{ fontWeight: 700 }}>
              Leaderboard
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Crazy 8&apos;s — Tournament
            </p>
          </div>
          <div className="flex gap-4 items-center">
            {leaderboard && leaderboard.length >= 2 && (
              <button
                onClick={toggleCompareMode}
                className={`text-sm font-medium transition-colors ${
                  compareMode
                    ? "text-[var(--accent-gold)] underline"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {compareMode ? "Exit Compare" : "Compare"}
              </button>
            )}
            <Link
              href="/bracket"
              className="text-sm text-[var(--accent-gold)] font-medium hover:text-[var(--accent-gold-hover)] transition-colors"
            >
              View Bracket
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Admin
              </Link>
            )}
            <Link
              href="/"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Compare mode instructions */}
        {compareMode && (
          <div className="surface-card px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              {compareSelection.length === 0 && "Select two players to compare"}
              {compareSelection.length === 1 && "Select one more player to compare"}
              {compareSelection.length === 2 && "Comparing selected players"}
            </p>
            {compareSelection.length > 0 && (
              <button
                onClick={() => setCompareSelection([])}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {/* Head-to-Head panel */}
        {compareMode && compareSelection.length === 2 && leaderboard && (
          <HeadToHeadPanel
            player1Id={compareSelection[0]}
            player2Id={compareSelection[1]}
            leaderboard={leaderboard}
            onClose={closeCompare}
          />
        )}

        {!leaderboard || leaderboard.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            No picks submitted yet. Check back once the tournament starts!
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => {
              const isSelected = compareSelection.includes(entry.playerId);

              return (
                <div
                  key={entry.playerId}
                  className={`surface-card overflow-hidden transition-all ${
                    compareMode && isSelected
                      ? "ring-2 ring-[var(--accent-gold)] ring-offset-0"
                      : ""
                  }`}
                >
                  <button
                    onClick={() => handlePlayerClick(entry.playerId)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                      compareMode
                        ? isSelected
                          ? "bg-[var(--accent-gold-glow)]"
                          : "hover:bg-[var(--bg-elevated)]"
                        : "hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    {/* Compare checkbox indicator */}
                    {compareMode && (
                      <span
                        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 text-xs transition-colors ${
                          isSelected
                            ? "bg-[var(--accent-gold)] border-[var(--accent-gold)] text-[var(--bg-primary)]"
                            : "border-[var(--border)] text-transparent"
                        }`}
                      >
                        {isSelected ? "\u2713" : ""}
                      </span>
                    )}

                    {/* Rank badge */}
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${rankBadgeStyle(entry.rank)}`}
                    >
                      {entry.rank}
                    </span>

                    {/* Player name */}
                    <span className="flex-1 font-semibold text-lg text-[var(--text-primary)] min-w-0 truncate">
                      {entry.playerName}
                    </span>

                    {/* Points + Sparkline */}
                    <span className="flex items-center gap-1 text-right flex-shrink-0">
                      <span className="scoreboard-num text-2xl text-[var(--accent-gold)]">
                        {entry.totalPoints}
                      </span>
                      <span className="text-sm font-normal text-[var(--text-muted)]">pts</span>
                      {entry.pointsByRound && (
                        <PointsSparkline pointsByRound={entry.pointsByRound} />
                      )}
                    </span>

                    {/* Expand arrow (hidden in compare mode) */}
                    {!compareMode && (
                      <span className="text-[var(--text-muted)] text-xs ml-2 flex-shrink-0">
                        {expandedPlayer === entry.playerId ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                  </button>

                  {/* Expanded team breakdown */}
                  {!compareMode && expandedPlayer === entry.playerId && (
                    <div className="border-t border-[var(--border)]">
                      {/* Still In The Hunt section */}
                      <StillInTheHunt teams={entry.teams} />

                      {entry.teams.map((team, idx) => (
                        <div
                          key={team.teamId}
                          className={`flex items-center gap-3 px-5 py-3 ${
                            idx % 2 === 0 ? "bg-[var(--bg-surface)]" : "bg-[var(--bg-elevated)]"
                          } ${team.eliminated ? "opacity-40" : ""}`}
                        >
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={team.teamName}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                              {team.seed}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm text-[var(--text-primary)]">
                              {team.teamName}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              #{team.seed} — {team.region}
                              {team.eliminated && (
                                <span className="text-[var(--danger)] ml-1">— Eliminated</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="scoreboard-num text-[var(--accent-gold)]">
                              {team.points} <span className="text-xs font-normal text-[var(--text-muted)]">pts</span>
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {team.wins} win{team.wins !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Smack Talk */}
        <div className="pt-4">
          <SmackTalk />
        </div>

        {/* Feature 4: Most Popular Picks */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="pt-4">
            <MostPopularPicks />
          </div>
        )}
      </div>
    </div>
  );
}
