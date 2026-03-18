"use client";

import { useState, useEffect, useCallback } from "react";

interface Team {
  id: string;
  name: string;
  seed: number;
  region: string;
  logoUrl: string | null;
  eliminated: boolean;
}

const REGIONS = ["East", "West", "South", "Midwest"];
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTeams = useCallback(async () => {
    const res = await fetch("/api/admin/teams");
    if (res.ok) {
      const data = await res.json();
      setTeams(data);

      // Build draft from existing teams
      const d: Record<string, string> = {};
      for (const team of data) {
        d[`${team.region}-${team.seed}`] = team.name;
      }
      setDraft(d);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  function startEdit() {
    // Pre-fill draft with current teams
    const d: Record<string, string> = {};
    for (const region of REGIONS) {
      for (const seed of SEEDS) {
        const team = teams.find((t) => t.region === region && t.seed === seed);
        d[`${region}-${seed}`] = team?.name || "";
      }
    }
    setDraft(d);
    setEditMode(true);
  }

  async function handleSave() {
    setSaving(true);

    const teamsToSave = [];
    for (const region of REGIONS) {
      for (const seed of SEEDS) {
        const name = draft[`${region}-${seed}`]?.trim();
        if (name) {
          teamsToSave.push({ name, seed, region });
        }
      }
    }

    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teams: teamsToSave }),
    });

    if (res.ok) {
      setEditMode(false);
      setMessage({ type: "success", text: `Saved ${teamsToSave.length} teams successfully!` });
      fetchTeams();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to save teams" });
    }
    setSaving(false);
  }

  async function handleLogoUpload(teamId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("teamId", teamId);

    const res = await fetch("/api/admin/teams/upload-logo", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      fetchTeams();
    }
  }

  if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase tracking-wide gold-text" style={{ fontWeight: 700 }}>
          Teams
        </h1>
        {!editMode ? (
          <button
            onClick={startEdit}
            className="btn-gold px-6 py-2 rounded-lg text-sm"
          >
            {teams.length > 0 ? "Edit Teams" : "Enter Teams"}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setEditMode(false)}
              className="px-6 py-2 border border-[var(--border)] text-[var(--text-muted)] rounded-lg font-medium hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-gold px-6 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        )}
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

      {editMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {REGIONS.map((region) => (
            <div
              key={region}
              className="surface-card p-5"
            >
              <h2 className="font-display text-lg uppercase tracking-wide text-[var(--accent-gold)] mb-4" style={{ fontWeight: 700 }}>
                {region} Region
              </h2>
              <div className="space-y-2">
                {SEEDS.map((seed) => (
                  <div key={seed} className="flex items-center gap-3">
                    <span className="w-8 text-right text-sm font-medium text-[var(--text-muted)]">
                      #{seed}
                    </span>
                    <input
                      type="text"
                      placeholder={`#${seed} seed team name`}
                      value={draft[`${region}-${seed}`] || ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [`${region}-${seed}`]: e.target.value }))
                      }
                      className="flex-1 px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          No teams entered yet. Click &quot;Enter Teams&quot; to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {REGIONS.map((region) => {
            const regionTeams = teams.filter((t) => t.region === region);
            return (
              <div
                key={region}
                className="surface-card overflow-hidden"
              >
                <div className="px-5 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <h2 className="font-display text-base uppercase tracking-wide text-[var(--accent-gold)]" style={{ fontWeight: 700 }}>
                    {region} Region
                  </h2>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {regionTeams.map((team) => (
                    <div
                      key={team.id}
                      className={`flex items-center gap-3 px-5 py-3 ${
                        team.eliminated ? "opacity-40" : ""
                      }`}
                    >
                      <span className="w-8 text-right text-sm font-medium text-[var(--text-muted)]">
                        #{team.seed}
                      </span>
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          alt={team.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <label className="w-8 h-8 rounded bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer hover:bg-[var(--border)] transition-colors">
                          <span className="text-xs text-[var(--text-muted)]">+</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(team.id, file);
                            }}
                          />
                        </label>
                      )}
                      <span className="flex-1 font-medium text-[var(--text-primary)]">{team.name}</span>
                      {team.eliminated && (
                        <span className="text-xs text-[var(--danger)]">Eliminated</span>
                      )}
                      {team.logoUrl && (
                        <label className="text-xs text-[var(--accent-gold)] cursor-pointer hover:text-[var(--accent-gold-hover)] transition-colors">
                          Replace logo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(team.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
