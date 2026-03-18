"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPanel() {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(mode: "season" | "full") {
    const confirmText =
      mode === "season"
        ? "This will clear all results, picks, and player pick status. Teams and players will be kept. Are you sure?"
        : "This will delete ALL data — teams, players, results, and picks. Only your admin account will remain. Are you sure?";

    if (!confirm(confirmText)) return;

    // Double confirm for full reset
    if (mode === "full") {
      if (!confirm("This cannot be undone. Are you absolutely sure?")) return;
    }

    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage({ type: "success", text: data.message });
      router.refresh();
    } else {
      setMessage({ type: "error", text: data.error || "Reset failed" });
    }
    setLoading(false);
  }

  return (
    <div className="surface-card p-6 space-y-4">
      <h2 className="font-display text-lg uppercase tracking-wide text-[var(--accent-gold)]" style={{ fontWeight: 700 }}>
        Reset Game
      </h2>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-[var(--success-glow)] border border-[var(--success)] text-[var(--success)]"
              : "bg-[var(--danger-glow)] border border-[var(--danger)] text-[var(--danger)]"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-[var(--border)] rounded-lg p-4 space-y-3 bg-[var(--bg-elevated)]">
          <h3 className="font-medium text-[var(--text-primary)]">New Season Reset</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Clears all results, picks, and unlocks picks. Keeps teams and players intact so you can start a new round of picks.
          </p>
          <button
            onClick={() => handleReset("season")}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--accent-gold) 0%, #d4900a 100%)',
              color: 'var(--bg-primary)',
            }}
          >
            {loading ? "Resetting..." : "Reset Season"}
          </button>
        </div>

        <div className="border border-[var(--danger)] rounded-lg p-4 space-y-3 bg-[var(--danger-glow)]">
          <h3 className="font-medium text-[var(--text-primary)]">Full Reset</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Deletes everything — teams, players, results, and picks. Only your admin account is kept. Use this to start completely fresh.
          </p>
          <button
            onClick={() => handleReset("full")}
            disabled={loading}
            className="px-4 py-2 bg-[var(--danger)] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 shadow-[0_0_12px_var(--danger-glow)]"
          >
            {loading ? "Resetting..." : "Full Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}
