// Standard 64-team tournament bracket structure within a region.
// Round 1 matchups by seed pairing (higher seed listed first):
// Game 1: 1v16, Game 2: 8v9, Game 3: 5v12, Game 4: 4v13
// Game 5: 6v11, Game 6: 3v14, Game 7: 7v10, Game 8: 2v15
//
// Round 2: W(G1)vW(G2), W(G3)vW(G4), W(G5)vW(G6), W(G7)vW(G8)
// Round 3 (Sweet 16): W(R2-G1)vW(R2-G2), W(R2-G3)vW(R2-G4)
// Round 4 (Elite 8): W(R3-G1)vW(R3-G2)

export const ROUND_1_MATCHUPS: [number, number][] = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
];

export const REGIONS = ["East", "West", "South", "Midwest"];

export const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
};

export interface TeamInfo {
  id: string;
  name: string;
  seed: number;
  region: string;
  eliminated: boolean;
  logoUrl: string | null;
}

export interface Matchup {
  teamA: TeamInfo | null;
  teamB: TeamInfo | null;
  region?: string; // undefined for Final Four / Championship
  round: number;
  gameIndex: number; // position in the bracket for this round
}

export interface GameResultInfo {
  id: string;
  round: number;
  winningTeamId: string;
  losingTeamId: string;
}

// Get round 1 matchups for a region
function getRound1Matchups(
  regionTeams: TeamInfo[],
  region: string
): Matchup[] {
  return ROUND_1_MATCHUPS.map(([seedA, seedB], i) => ({
    teamA: regionTeams.find((t) => t.seed === seedA) || null,
    teamB: regionTeams.find((t) => t.seed === seedB) || null,
    region,
    round: 1,
    gameIndex: i,
  }));
}

// Given results so far, find the winner of a specific game
function getWinner(
  matchup: Matchup,
  results: GameResultInfo[]
): TeamInfo | null {
  if (!matchup.teamA || !matchup.teamB) return null;
  const result = results.find(
    (r) =>
      r.round === matchup.round &&
      ((r.winningTeamId === matchup.teamA!.id &&
        r.losingTeamId === matchup.teamB!.id) ||
        (r.winningTeamId === matchup.teamB!.id &&
          r.losingTeamId === matchup.teamA!.id))
  );
  if (!result) return null;
  return result.winningTeamId === matchup.teamA.id
    ? matchup.teamA
    : matchup.teamB;
}

// Build matchups for rounds 2-4 within a region
function getRegionMatchups(
  regionTeams: TeamInfo[],
  region: string,
  results: GameResultInfo[]
): Matchup[][] {
  const rounds: Matchup[][] = [];

  // Round 1
  const r1 = getRound1Matchups(regionTeams, region);
  rounds.push(r1);

  // Round 2: winners of adjacent R1 games
  const r2: Matchup[] = [];
  for (let i = 0; i < 4; i++) {
    r2.push({
      teamA: getWinner(r1[i * 2], results),
      teamB: getWinner(r1[i * 2 + 1], results),
      region,
      round: 2,
      gameIndex: i,
    });
  }
  rounds.push(r2);

  // Round 3 (Sweet 16): winners of adjacent R2 games
  const r3: Matchup[] = [];
  for (let i = 0; i < 2; i++) {
    r3.push({
      teamA: getWinner(r2[i * 2], results),
      teamB: getWinner(r2[i * 2 + 1], results),
      region,
      round: 3,
      gameIndex: i,
    });
  }
  rounds.push(r3);

  // Round 4 (Elite 8): winners of R3 games
  rounds.push([
    {
      teamA: getWinner(r3[0], results),
      teamB: getWinner(r3[1], results),
      region,
      round: 4,
      gameIndex: 0,
    },
  ]);

  return rounds;
}

// Standard Final Four pairings: region index 0v1 and 2v3
// (East vs West, South vs Midwest — admin can reorder regions if needed)
const FINAL_FOUR_PAIRINGS: [number, number][] = [
  [0, 1], // East vs West
  [2, 3], // South vs Midwest
];

export function buildFullBracket(
  teams: TeamInfo[],
  results: GameResultInfo[]
): { regionRounds: Record<string, Matchup[][]>; finalFour: Matchup[]; championship: Matchup } {
  const regionRounds: Record<string, Matchup[][]> = {};
  const regionWinners: (TeamInfo | null)[] = [];

  for (const region of REGIONS) {
    const regionTeams = teams.filter((t) => t.region === region);
    const rounds = getRegionMatchups(regionTeams, region, results);
    regionRounds[region] = rounds;

    // Elite 8 winner = region champion
    const elite8 = rounds[3][0];
    regionWinners.push(getWinner(elite8, results));
  }

  // Final Four
  const finalFour: Matchup[] = FINAL_FOUR_PAIRINGS.map(([a, b], i) => ({
    teamA: regionWinners[a],
    teamB: regionWinners[b],
    round: 5,
    gameIndex: i,
  }));

  // Championship
  const championship: Matchup = {
    teamA: getWinner(finalFour[0], results),
    teamB: getWinner(finalFour[1], results),
    round: 6,
    gameIndex: 0,
  };

  return { regionRounds, finalFour, championship };
}

// Get all pending (unplayed) matchups where both teams are known
export function getPendingMatchups(
  teams: TeamInfo[],
  results: GameResultInfo[]
): Matchup[] {
  const { regionRounds, finalFour, championship } = buildFullBracket(
    teams,
    results
  );

  const pending: Matchup[] = [];

  for (const region of REGIONS) {
    for (const roundMatchups of regionRounds[region]) {
      for (const m of roundMatchups) {
        if (m.teamA && m.teamB && !getWinner(m, results)) {
          pending.push(m);
        }
      }
    }
  }

  for (const m of finalFour) {
    if (m.teamA && m.teamB && !getWinner(m, results)) {
      pending.push(m);
    }
  }

  if (championship.teamA && championship.teamB && !getWinner(championship, results)) {
    pending.push(championship);
  }

  return pending;
}
