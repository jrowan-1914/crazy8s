"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Team {
  id: string;
  name: string;
  seed: number;
  region: string;
  logoUrl: string | null;
  eliminated: boolean;
}

interface PickedTeam extends Team {
  wins: { id: string }[];
}

function PicksContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [player, setPlayer] = useState<{ id: string; name: string; picksSubmitted: boolean } | null>(null);
  const [teams, setTeams] = useState<{ byRegion: Record<string, Team[]> }>({ byRegion: {} });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submittedPicks, setSubmittedPicks] = useState<PickedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [picksLocked, setPicksLocked] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;

    const [playerRes, teamsRes, settingsRes] = await Promise.all([
      fetch(`/api/player/access?token=${token}`),
      fetch("/api/teams"),
      fetch("/api/admin/settings"),
    ]);

    if (!playerRes.ok) {
      setError("Invalid access link");
      setLoading(false);
      return;
    }

    const playerData = await playerRes.json();
    setPlayer(playerData);

    // Save player name for Smack Talk auto-fill
    if (playerData.name) {
      localStorage.setItem("smacktalk-author", playerData.name);
    }

    if (teamsRes.ok) setTeams(await teamsRes.json());
    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      setPicksLocked(settings.picksLocked);
    }

    // If picks already submitted, fetch them
    if (playerData.picksSubmitted) {
      const picksRes = await fetch("/api/picks", {
        headers: { "x-access-token": token },
      });
      if (picksRes.ok) {
        const data = await picksRes.json();
        setSubmittedPicks(data.picks.map((p: { team: PickedTeam }) => p.team));
      }
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleTeam(teamId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else if (next.size < 8) {
        next.add(teamId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size !== 8 || !token) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/picks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify({ teamIds: Array.from(selected) }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSubmitting(false);
      return;
    }

    fetchData();
    setSubmitting(false);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-[var(--text-muted)]">Use your unique link to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (error && !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-[var(--danger)]">{error}</p>
      </div>
    );
  }

  // Show submitted picks view
  if (player?.picksSubmitted) {
    const totalPoints = submittedPicks.reduce((sum, t) => sum + t.seed * (t.wins?.length || 0), 0);
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl gold-text" style={{ fontWeight: 700 }}>
              Your Picks
            </h1>
            <p className="text-[var(--text-muted)]">{player.name}</p>
          </div>

          <div className="surface-card overflow-hidden">
            {submittedPicks.map((team, idx) => {
              const wins = team.wins?.length || 0;
              const points = team.seed * wins;
              return (
                <div
                  key={team.id}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    idx > 0 ? "border-t border-[var(--border)]" : ""
                  } ${idx % 2 === 0 ? "bg-[var(--bg-surface)]" : "bg-[var(--bg-elevated)]"} ${
                    team.eliminated ? "opacity-40" : ""
                  }`}
                >
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-10 h-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                      {team.seed}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{team.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      #{team.seed} seed — {team.region}
                      {team.eliminated && (
                        <span className="text-[var(--danger)] ml-1">— Eliminated</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="scoreboard-num text-lg text-[var(--accent-gold)]">
                      {points} <span className="text-xs font-normal text-[var(--text-muted)]">pts</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{wins} win{wins !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center py-4">
            <p className="text-sm text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Score</p>
            <p className="scoreboard-num text-4xl text-[var(--accent-gold)]">
              {totalPoints}
              <span className="text-lg text-[var(--text-muted)] ml-2 font-normal">pts</span>
            </p>
          </div>

          <div className="text-center">
            <a
              href="/leaderboard"
              className="text-sm text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] transition-colors font-medium"
            >
              View Leaderboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Picks locked view
  if (picksLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl gold-text" style={{ fontWeight: 700 }}>
            Picks are Locked
          </h1>
          <p className="text-[var(--text-muted)]">The tournament has started. Picks can no longer be submitted.</p>
        </div>
      </div>
    );
  }

  // Picks selection view
  const allTeamsFlat = Object.values(teams.byRegion).flat();
  const selectedTeams = allTeamsFlat.filter((t) => selected.has(t.id));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl gold-text" style={{ fontWeight: 700 }}>
            Make Your Picks
          </h1>
          <p className="text-[var(--text-muted)]">
            {player?.name} — Select exactly 8 teams
          </p>
        </div>

        {/* Sticky counter bar */}
        <div className="sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-sm py-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              <span
                className={`scoreboard-num text-2xl ${
                  selected.size === 8 ? "text-[var(--success)]" : "text-[var(--accent-gold)]"
                }`}
              >
                {selected.size}
              </span>
              <span className="text-[var(--text-muted)] mx-1">/</span>
              <span className="text-[var(--text-muted)]">8 selected</span>
            </p>
            <button
              onClick={handleSubmit}
              disabled={selected.size !== 8 || submitting}
              className="btn-gold px-6 py-2.5 rounded-lg text-sm uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Picks"}
            </button>
          </div>

          {/* Selected teams summary pills */}
          {selectedTeams.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedTeams.map((team) => (
                <span
                  key={team.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--accent-gold-glow)] border border-[var(--accent-gold)] text-[var(--accent-gold)] text-sm rounded-full"
                >
                  {team.logoUrl && (
                    <img src={team.logoUrl} alt="" className="w-4 h-4 object-contain" />
                  )}
                  ({team.seed}) {team.name}
                  <button
                    onClick={() => toggleTeam(team.id)}
                    className="ml-1 text-[var(--accent-gold)]/60 hover:text-[var(--accent-gold)] transition-colors"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-[var(--danger-glow)] border border-[var(--danger)] rounded-lg text-[var(--danger)] text-sm">
            {error}
          </div>
        )}

        {/* Teams by region */}
        <div className="space-y-6">
          {Object.entries(teams.byRegion).map(([region, regionTeams]) => (
            <div
              key={region}
              className="surface-card overflow-hidden"
            >
              <div className="px-5 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center gap-2">
                <span className="w-1 h-5 bg-[var(--accent-gold)] rounded-full"></span>
                <h2 className="font-display text-lg text-[var(--text-primary)]" style={{ fontWeight: 700 }}>
                  {region} Region
                </h2>
              </div>
              <div>
                {regionTeams.map((team, idx) => {
                  const isSelected = selected.has(team.id);
                  const canSelect = selected.size < 8 || isSelected;
                  return (
                    <button
                      key={team.id}
                      onClick={() => canSelect && toggleTeam(team.id)}
                      disabled={!canSelect}
                      className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-all ${
                        idx > 0 ? "border-t border-[var(--border)]" : ""
                      } ${
                        isSelected
                          ? "bg-[var(--accent-gold-glow)] border-l-4 border-l-[var(--accent-gold)] shadow-[inset_0_0_20px_var(--accent-gold-glow)]"
                          : canSelect
                          ? "hover:bg-[var(--bg-elevated)]"
                          : "opacity-30 cursor-not-allowed"
                      }`}
                    >
                      <span className="w-8 text-right text-sm font-medium text-[var(--text-muted)]">
                        #{team.seed}
                      </span>
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                          {team.seed}
                        </div>
                      )}
                      <span className={`flex-1 font-medium ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"}`}>
                        {team.name}
                      </span>
                      {isSelected && (
                        <span className="text-[var(--accent-gold)] text-sm font-semibold uppercase tracking-wider">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PicksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><p className="text-[var(--text-muted)]">Loading...</p></div>}>
      <PicksContent />
    </Suspense>
  );
}
