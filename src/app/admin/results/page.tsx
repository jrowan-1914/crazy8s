"use client";

import { useState, useEffect, useCallback } from "react";

interface TeamInfo {
  id: string;
  name: string;
  seed: number;
  region: string;
  eliminated: boolean;
  logoUrl: string | null;
}

interface Matchup {
  teamA: TeamInfo | null;
  teamB: TeamInfo | null;
  region?: string;
  round: number;
  gameIndex: number;
}

interface GameResultInfo {
  id: string;
  round: number;
  winningTeamId: string;
  losingTeamId: string;
}

const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
};

export default function ResultsPage() {
  const [pending, setPending] = useState<Matchup[]>([]);
  const [results, setResults] = useState<GameResultInfo[]>([]);
  const [bracket, setBracket] = useState<{
    regionRounds: Record<string, Matchup[][]>;
    finalFour: Matchup[];
    championship: Matchup | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ picksLocked: boolean }>({ picksLocked: false });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    // Sequential fetches to avoid overwhelming the single DB connection
    const bracketRes = await fetch("/api/admin/bracket");
    if (bracketRes.ok) {
      const data = await bracketRes.json();
      setBracket(data.bracket);
      setPending(data.pending);
      setResults(data.results);
    }
    const settingsRes = await fetch("/api/admin/settings");
    if (settingsRes.ok) setSettings(await settingsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleLock() {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picksLocked: !settings.picksLocked }),
    });
    if (res.ok) {
      setSettings(await res.json());
    }
  }

  async function recordWinner(matchup: Matchup, winner: TeamInfo) {
    const loser =
      winner.id === matchup.teamA!.id ? matchup.teamB! : matchup.teamA!;

    const key = `${matchup.round}-${matchup.gameIndex}`;
    setSubmitting(key);
    setMessage(null);

    const res = await fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        round: matchup.round,
        winningTeamId: winner.id,
        losingTeamId: loser.id,
      }),
    });

    if (res.ok) {
      setMessage({
        type: "success",
        text: `Recorded: (${winner.seed}) ${winner.name} defeats (${loser.seed}) ${loser.name}`,
      });
      fetchData();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to record result" });
    }
    setSubmitting(null);
  }

  async function undoResult(resultId: string) {
    if (!confirm("Undo this result?")) return;
    setMessage(null);

    const res = await fetch(`/api/admin/results?id=${resultId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setMessage({ type: "success", text: "Result removed" });
      fetchData();
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        Loading...
      </div>
    );

  // Group pending matchups by round
  const pendingByRound: Record<number, Matchup[]> = {};
  for (const m of pending) {
    if (!pendingByRound[m.round]) pendingByRound[m.round] = [];
    pendingByRound[m.round].push(m);
  }

  // Find the current (earliest) round with pending games
  const currentRound = Math.min(
    ...Object.keys(pendingByRound).map(Number),
    7
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase tracking-wide gold-text" style={{ fontWeight: 700 }}>
          Results
        </h1>
        <button
          onClick={toggleLock}
          className={`px-6 py-2 rounded-lg font-medium text-white transition-all ${
            settings.picksLocked
              ? "bg-[var(--danger)] hover:brightness-110 shadow-[0_0_12px_var(--danger-glow)]"
              : "bg-[var(--success)] hover:brightness-110 shadow-[0_0_12px_var(--success-glow)]"
          }`}
        >
          {settings.picksLocked ? "Unlock Picks" : "Lock Picks"}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-[var(--success-glow)] border border-[var(--success)] text-[var(--success)]"
              : "bg-[var(--danger-glow)] border border-[var(--danger)] text-[var(--danger)]"
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right text-current opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Pending games */}
      {pending.length > 0 ? (
        Object.entries(pendingByRound)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([round, matchups]) => {
            const roundNum = Number(round);
            const isCurrentRound = roundNum === currentRound;

            // Group matchups by region (or "Final Four" / "Championship" for rounds 5-6)
            const byRegion: Record<string, Matchup[]> = {};
            for (const m of matchups) {
              const group = m.region ? `${m.region} Region` : ROUND_NAMES[m.round];
              if (!byRegion[group]) byRegion[group] = [];
              byRegion[group].push(m);
            }

            return (
              <div key={round} className="space-y-4">
                <h2 className="font-display text-xl uppercase tracking-wide text-[var(--text-primary)]" style={{ fontWeight: 700 }}>
                  {ROUND_NAMES[roundNum]}
                  {!isCurrentRound && (
                    <span className="text-sm font-normal text-[var(--text-muted)] ml-2 lowercase tracking-normal" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      (waiting for earlier rounds)
                    </span>
                  )}
                </h2>

                {Object.entries(byRegion).map(([regionName, regionMatchups]) => (
                  <div key={regionName} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-gold)]">
                        {regionName}
                      </h3>
                      <div className="flex-1 h-px bg-[var(--accent-gold)] opacity-20" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {regionMatchups.map((matchup) => {
                        const key = `${matchup.round}-${matchup.gameIndex}`;
                        const isSubmitting = submitting === key;

                        return (
                          <MatchupCard
                            key={key}
                            matchup={matchup}
                            isActive={isCurrentRound}
                            isSubmitting={isSubmitting}
                            onPickWinner={(winner) => recordWinner(matchup, winner)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
      ) : results.length > 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)]">
          All games recorded! The tournament is complete.
        </div>
      ) : (
        <div className="text-center py-8 text-[var(--text-muted)]">
          No teams entered yet. Add teams first to see matchups.
        </div>
      )}

      {/* Completed results */}
      {results.length > 0 && bracket && (
        <div className="space-y-4">
          <h2 className="font-display text-xl uppercase tracking-wide text-[var(--text-primary)]" style={{ fontWeight: 700 }}>
            Completed Games
          </h2>
          <div className="surface-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--bg-elevated)] text-left text-sm text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Round</th>
                  <th className="px-6 py-3 font-medium">Winner</th>
                  <th className="px-6 py-3 font-medium">Defeated</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {[...results].reverse().map((result, idx) => {
                  // Find team names from bracket data
                  const allTeams = [
                    ...Object.values(bracket.regionRounds).flatMap((rounds) =>
                      rounds.flatMap((matchups) =>
                        matchups.flatMap((m) => [m.teamA, m.teamB].filter(Boolean))
                      )
                    ),
                    bracket.finalFour.flatMap((m) => [m.teamA, m.teamB].filter(Boolean)),
                    bracket.championship
                      ? [bracket.championship.teamA, bracket.championship.teamB].filter(Boolean)
                      : [],
                  ].flat() as TeamInfo[];

                  const winner = allTeams.find((t) => t.id === result.winningTeamId);
                  const loser = allTeams.find((t) => t.id === result.losingTeamId);

                  return (
                    <tr key={result.id} className={idx % 2 === 1 ? "bg-[var(--bg-elevated)]" : ""}>
                      <td className="px-6 py-3 text-sm text-[var(--text-muted)]">
                        {ROUND_NAMES[result.round]}
                      </td>
                      <td className="px-6 py-3 font-medium text-sm text-[var(--success)]">
                        {winner
                          ? `(${winner.seed}) ${winner.name}`
                          : result.winningTeamId}
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--text-muted)]">
                        {loser
                          ? `(${loser.seed}) ${loser.name}`
                          : result.losingTeamId}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => undoResult(result.id)}
                          className="text-sm text-[var(--danger)] hover:brightness-125 transition-colors"
                        >
                          Undo
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchupCard({
  matchup,
  isActive,
  isSubmitting,
  onPickWinner,
}: {
  matchup: Matchup;
  isActive: boolean;
  isSubmitting: boolean;
  onPickWinner: (winner: TeamInfo) => void;
}) {
  return (
    <div
      className={`surface-card overflow-hidden ${
        !isActive ? "opacity-50" : ""
      }`}
    >
      <div className="flex">
        <TeamButton
          team={matchup.teamA!}
          isActive={isActive}
          isSubmitting={isSubmitting}
          onClick={() => onPickWinner(matchup.teamA!)}
          className="border-r border-[var(--border)]"
        />
        <div className="flex items-center px-1 text-xs font-bold text-[var(--text-muted)]">
          vs
        </div>
        <TeamButton
          team={matchup.teamB!}
          isActive={isActive}
          isSubmitting={isSubmitting}
          onClick={() => onPickWinner(matchup.teamB!)}
        />
      </div>
    </div>
  );
}

function TeamButton({
  team,
  isActive,
  isSubmitting,
  onClick,
  className = "",
}: {
  team: TeamInfo;
  isActive: boolean;
  isSubmitting: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => isActive && !isSubmitting && onClick()}
      disabled={!isActive || isSubmitting}
      className={`flex-1 flex items-center gap-3 px-4 py-3 transition-all hover:bg-[var(--success-glow)] hover:shadow-[inset_0_0_20px_var(--success-glow)] disabled:hover:bg-transparent disabled:cursor-not-allowed ${className}`}
    >
      {team.logoUrl ? (
        <img src={team.logoUrl} alt="" className="w-8 h-8 object-contain" />
      ) : (
        <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
          {team.seed}
        </div>
      )}
      <div className="text-left">
        <p className="font-medium text-sm text-[var(--text-primary)]">{team.name}</p>
        <p className="text-xs text-[var(--text-muted)]">#{team.seed} seed</p>
      </div>
    </button>
  );
}
