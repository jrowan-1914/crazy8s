"use client";

import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { REGIONS } from "@/lib/bracket";
import type { TeamInfo, Matchup } from "@/lib/bracket";
import "./bracket.css";

interface BracketData {
  bracket: {
    regionRounds: Record<string, Matchup[][]>;
    finalFour: Matchup[];
    championship: Matchup;
  };
  pending: Matchup[];
  results: { id: string; round: number; winningTeamId: string; losingTeamId: string }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* ── tiny team cell ── */
function TeamCell({
  team,
  isWinner,
  results,
  matchup,
}: {
  team: TeamInfo | null;
  isWinner: boolean;
  results: BracketData["results"];
  matchup: Matchup;
}) {
  if (!team) {
    return (
      <div className="team-cell team-cell--tbd">
        <span className="seed-badge seed-badge--empty">?</span>
        <span className="team-name team-name--tbd">TBD</span>
      </div>
    );
  }

  const eliminated = team.eliminated;

  return (
    <div
      className={`team-cell ${isWinner ? "team-cell--winner" : ""} ${
        eliminated ? "team-cell--eliminated" : ""
      }`}
    >
      {team.logoUrl ? (
        <img
          src={team.logoUrl}
          alt={team.name}
          className="team-logo"
        />
      ) : (
        <span className="seed-badge">{team.seed}</span>
      )}
      <span className="team-name" title={team.name}>
        {team.name}
      </span>
      <span className="seed-num">({team.seed})</span>
    </div>
  );
}

/* ── single matchup ── */
function MatchupCard({
  matchup,
  results,
}: {
  matchup: Matchup;
  results: BracketData["results"];
}) {
  // determine winner of this matchup
  const winner = (() => {
    if (!matchup.teamA || !matchup.teamB) return null;
    const r = results.find(
      (res) =>
        res.round === matchup.round &&
        ((res.winningTeamId === matchup.teamA!.id &&
          res.losingTeamId === matchup.teamB!.id) ||
          (res.winningTeamId === matchup.teamB!.id &&
            res.losingTeamId === matchup.teamA!.id))
    );
    return r ? r.winningTeamId : null;
  })();

  return (
    <div className="matchup-card">
      <TeamCell
        team={matchup.teamA}
        isWinner={winner !== null && matchup.teamA?.id === winner}
        results={results}
        matchup={matchup}
      />
      <div className="matchup-divider" />
      <TeamCell
        team={matchup.teamB}
        isWinner={winner !== null && matchup.teamB?.id === winner}
        results={results}
        matchup={matchup}
      />
    </div>
  );
}

/* ── region bracket (4 rounds, normal or reversed) ── */
function RegionBracket({
  regionName,
  rounds,
  results,
  reversed = false,
}: {
  regionName: string;
  rounds: Matchup[][];
  results: BracketData["results"];
  reversed?: boolean;
}) {
  const displayRounds = reversed ? [...rounds].reverse() : rounds;

  return (
    <div className={`region-bracket ${reversed ? "region-bracket--reversed" : ""}`}>
      <h2 className="region-title">{regionName}</h2>
      <div className="region-rounds">
        {displayRounds.map((roundMatchups, colIdx) => {
          // Map column index back to the actual round index for spacing
          const roundIdx = reversed ? (rounds.length - 1 - colIdx) : colIdx;
          return (
            <div
              key={colIdx}
              className={`bracket-round bracket-round--${roundIdx}`}
            >
              {roundMatchups.map((m, idx) => (
                <div key={idx} className="bracket-game-wrapper">
                  <MatchupCard matchup={m} results={results} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── main page ── */
export default function BracketPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const { data, isLoading, error } = useSWR<BracketData>(
    "/api/admin/bracket",
    fetcher,
    { refreshInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading bracket...</p>
      </div>
    );
  }

  if (error || !data?.bracket) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--danger)' }}>Failed to load bracket.</p>
      </div>
    );
  }

  const { bracket, results } = data;
  const topRegions = [REGIONS[0], REGIONS[1]]; // East, West
  const bottomRegions = [REGIONS[2], REGIONS[3]]; // South, Midwest

  return (
    <div className="bracket-page">
      {/* Header */}
      <div className="bracket-header">
        <div>
          <h1 className="bracket-heading font-display gold-text">Tournament Bracket</h1>
          <p className="bracket-subheading">Crazy 8&apos;s &mdash; March Madness</p>
        </div>
        <div className="bracket-nav-links">
          <Link href="/" className="bracket-link">Home</Link>
          {isAdmin && <Link href="/admin" className="bracket-link">Admin</Link>}
          <Link href="/leaderboard" className="bracket-link">Leaderboard</Link>
        </div>
      </div>

      {/* Regions */}
      <div className="bracket-regions-container">
        <div className="bracket-regions-row">
          <RegionBracket
            regionName="East"
            rounds={bracket.regionRounds["East"]}
            results={results}
          />
          <RegionBracket
            regionName="West"
            rounds={bracket.regionRounds["West"]}
            results={results}
            reversed
          />
        </div>
        <div className="bracket-regions-row">
          <RegionBracket
            regionName="South"
            rounds={bracket.regionRounds["South"]}
            results={results}
          />
          <RegionBracket
            regionName="Midwest"
            rounds={bracket.regionRounds["Midwest"]}
            results={results}
            reversed
          />
        </div>
      </div>

      {/* Final Four + Championship */}
      <div className="final-rounds">
        <div className="final-section">
          <h2 className="final-title">Final Four</h2>
          <div className="final-matchups">
            {bracket.finalFour.map((m, i) => (
              <MatchupCard key={i} matchup={m} results={results} />
            ))}
          </div>
        </div>
        <div className="final-section">
          <h2 className="final-title">Championship</h2>
          <div className="final-matchups">
            <MatchupCard matchup={bracket.championship} results={results} />
          </div>
        </div>
      </div>

    </div>
  );
}
