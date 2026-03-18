"use client";

import { useState, useEffect, useCallback } from "react";

interface TeamPick {
  name: string;
  seed: number;
  region: string;
  logoUrl: string | null;
  eliminated: boolean;
}

interface Player {
  id: string;
  name: string;
  email: string;
  accessToken: string;
  picksSubmitted: boolean;
  picks: { team: TeamPick }[];
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const fetchPlayers = useCallback(async () => {
    const res = await fetch("/api/admin/players");
    if (res.ok) setPlayers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    setName("");
    setEmail("");
    fetchPlayers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this player?")) return;
    await fetch(`/api/admin/players?id=${id}`, { method: "DELETE" });
    fetchPlayers();
  }

  function getPicksLink(token: string) {
    return `${window.location.origin}/picks?token=${token}`;
  }

  if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl uppercase tracking-wide gold-text" style={{ fontWeight: 700 }}>
        Players
      </h1>

      <form onSubmit={handleAdd} className="elevated-card p-6 space-y-4">
        <h2 className="font-display text-lg uppercase tracking-wide text-[var(--accent-gold)]" style={{ fontWeight: 700 }}>
          Add Player
        </h2>
        {error && (
          <div className="p-3 bg-[var(--danger-glow)] border border-[var(--danger)] rounded-lg text-[var(--danger)] text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="btn-gold px-6 py-2 rounded-lg text-sm"
        >
          Add Player
        </button>
      </form>

      <div className="space-y-3">
        {players.map((player) => {
          const isExpanded = expandedPlayer === player.id;
          const activeCount = player.picks.filter((p) => !p.team.eliminated).length;
          const eliminatedCount = player.picks.filter((p) => p.team.eliminated).length;

          return (
            <div
              key={player.id}
              className="surface-card overflow-hidden"
            >
              <div className="flex items-center px-6 py-4 gap-4">
                <button
                  onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                  className="flex-1 flex items-center gap-4 text-left"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--text-primary)]">{player.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">{player.email}</p>
                  </div>
                  <div className="text-right">
                    {player.picksSubmitted ? (
                      <div>
                        <span className="text-[var(--success)] text-sm font-medium">
                          {activeCount} active
                        </span>
                        {eliminatedCount > 0 && (
                          <span className="text-[var(--danger)] text-sm font-medium ml-2">
                            {eliminatedCount} eliminated
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] text-sm">Picks pending</span>
                    )}
                  </div>
                  <span className="text-[var(--text-muted)]">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>
                <div className="flex items-center gap-3 border-l border-[var(--border)] pl-4">
                  <button
                    onClick={() => navigator.clipboard.writeText(getPicksLink(player.accessToken))}
                    className="text-sm text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] transition-colors"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => handleDelete(player.id)}
                    className="text-sm text-[var(--danger)] hover:brightness-125 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {isExpanded && player.picksSubmitted && (
                <div className="border-t border-[var(--border)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                    {player.picks
                      .sort((a, b) => a.team.seed - b.team.seed)
                      .map((pick) => (
                        <div
                          key={pick.team.name}
                          className={`flex items-center gap-3 px-5 py-3 ${
                            pick.team.eliminated ? "bg-[var(--danger-glow)]" : ""
                          }`}
                        >
                          {pick.team.logoUrl ? (
                            <img
                              src={pick.team.logoUrl}
                              alt={pick.team.name}
                              className={`w-8 h-8 object-contain ${
                                pick.team.eliminated ? "grayscale opacity-40" : ""
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                                pick.team.eliminated
                                  ? "bg-[var(--danger-glow)] text-[var(--danger)]"
                                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                              }`}
                            >
                              {pick.team.seed}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                pick.team.eliminated
                                  ? "line-through text-[var(--text-muted)]"
                                  : "text-[var(--text-primary)]"
                              }`}
                            >
                              {pick.team.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              #{pick.team.seed} — {pick.team.region}
                            </p>
                          </div>
                          {pick.team.eliminated && (
                            <span className="ml-auto text-xs font-bold text-[var(--danger)] whitespace-nowrap">
                              OUT
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {isExpanded && !player.picksSubmitted && (
                <div className="border-t border-[var(--border)] px-6 py-4 text-sm text-[var(--text-muted)]">
                  This player hasn&apos;t submitted picks yet.
                </div>
              )}
            </div>
          );
        })}
        {players.length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)]">
            No players added yet
          </div>
        )}
      </div>
    </div>
  );
}
