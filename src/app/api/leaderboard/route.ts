import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const players = await prisma.user.findMany({
    where: { role: "player", picksSubmitted: true },
    include: {
      picks: {
        include: {
          team: {
            include: {
              wins: true,
            },
          },
        },
      },
    },
  });

  const gameResults = await prisma.gameResult.findMany();

  // Build a map of teamId -> array of round numbers where that team won
  const teamWinRounds: Record<string, number[]> = {};
  for (const result of gameResults) {
    if (!teamWinRounds[result.winningTeamId]) {
      teamWinRounds[result.winningTeamId] = [];
    }
    teamWinRounds[result.winningTeamId].push(result.round);
  }

  const leaderboard = players
    .map((player) => {
      const pointsByRound: Record<number, number> = {};

      const teamScores = player.picks.map((pick) => {
        const winsByRound = teamWinRounds[pick.team.id] || [];

        // Accumulate points per round for this player
        for (const round of winsByRound) {
          pointsByRound[round] = (pointsByRound[round] || 0) + pick.team.seed;
        }

        return {
          teamId: pick.team.id,
          teamName: pick.team.name,
          seed: pick.team.seed,
          region: pick.team.region,
          logoUrl: pick.team.logoUrl,
          eliminated: pick.team.eliminated,
          wins: pick.team.wins.length,
          points: pick.team.seed * pick.team.wins.length,
          winsByRound: winsByRound.sort((a, b) => a - b),
        };
      });

      return {
        playerId: player.id,
        playerName: player.name,
        totalPoints: teamScores.reduce((sum, t) => sum + t.points, 0),
        teams: teamScores.sort((a, b) => b.points - a.points),
        pointsByRound,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign ranks (handling ties)
  let rank = 1;
  for (let i = 0; i < leaderboard.length; i++) {
    if (i > 0 && leaderboard[i].totalPoints < leaderboard[i - 1].totalPoints) {
      rank = i + 1;
    }
    (leaderboard[i] as Record<string, unknown>).rank = rank;
  }

  return NextResponse.json(leaderboard);
}
