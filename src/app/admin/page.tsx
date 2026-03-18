"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ResetPanel from "./ResetPanel";

interface DashboardData {
  teamCount: number;
  playerCount: number;
  picksSubmittedCount: number;
  resultCount: number;
  picksLocked: boolean;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-[var(--danger)]">Failed to load dashboard data.</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl font-700 uppercase tracking-wide" style={{ fontWeight: 700 }}>
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Teams Entered" value={data.teamCount} target={64} href="/admin/teams" />
        <StatCard label="Players" value={data.playerCount} href="/admin/players" />
        <StatCard label="Picks Submitted" value={data.picksSubmittedCount} total={data.playerCount} href="/admin/players" />
        <StatCard label="Games Recorded" value={data.resultCount} href="/admin/results" />
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-700 uppercase tracking-wide mb-4" style={{ fontWeight: 700 }}>
          Tournament Status
        </h2>
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              data.picksLocked
                ? "bg-[var(--danger)] glow-danger"
                : "bg-[var(--success)] glow-success"
            }`}
          />
          <span className="text-[var(--text-primary)]">
            Picks are currently{" "}
            <strong className={data.picksLocked ? "text-[var(--danger)]" : "text-[var(--success)]"}>
              {data.picksLocked ? "locked" : "open"}
            </strong>
          </span>
        </div>
      </div>

      <ResetPanel />
    </div>
  );
}

function StatCard({
  label,
  value,
  target,
  total,
  href,
}: {
  label: string;
  value: number;
  target?: number;
  total?: number;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-sm text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
      <p className="scoreboard-num text-4xl mt-2 text-[var(--text-primary)]">
        {value}
        {target !== undefined && (
          <span className="text-lg font-normal text-[var(--text-muted)]">
            /{target}
          </span>
        )}
        {total !== undefined && (
          <span className="text-lg font-normal text-[var(--text-muted)]">
            /{total}
          </span>
        )}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="surface-card p-5 hover:border-[var(--accent-gold)] transition-all group"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="surface-card p-5">
      {content}
    </div>
  );
}
