import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const p1Id = searchParams.get("p1");
  const p2Id = searchParams.get("p2");

  if (!p1Id || !p2Id) {
    return NextResponse.json(
      { error: "Both p1 and p2 query params are required" },
      { status: 400 }
    );
  }

  const player1 = await prisma.user.findUnique({
    where: { id: p1Id },
    include: {
      picks: {
        include: {
          team: {
            include: { wins: true },
          },
        },
      },
    },
  });

  const player2 = await prisma.user.findUnique({
    where: { id: p2Id },
    include: {
      picks: {
        include: {
          team: {
            include: { wins: true },
          },
        },
      },
    },
  });

  if (!player1 || !player2) {
    return NextResponse.json(
      { error: "One or both players not found" },
      { status: 404 }
    );
  }

  function buildPickDetails(picks: typeof player1.picks) {
    return picks.map((pick) => {
      const wins = pick.team.wins.length;
      return {
        teamId: pick.team.id,
        teamName: pick.team.name,
        seed: pick.team.seed,
        region: pick.team.region,
        logoUrl: pick.team.logoUrl,
        eliminated: pick.team.eliminated,
        wins,
        points: pick.team.seed * wins,
      };
    });
  }

  const p1Picks = buildPickDetails(player1.picks);
  const p2Picks = buildPickDetails(player2.picks);

  const p1TeamIds = new Set(p1Picks.map((p) => p.teamId));
  const p2TeamIds = new Set(p2Picks.map((p) => p.teamId));

  const sharedTeams = [...p1TeamIds].filter((id) => p2TeamIds.has(id));
  const uniqueToP1 = [...p1TeamIds].filter((id) => !p2TeamIds.has(id));
  const uniqueToP2 = [...p2TeamIds].filter((id) => !p1TeamIds.has(id));

  return NextResponse.json({
    player1: {
      playerId: player1.id,
      playerName: player1.name,
      totalPoints: p1Picks.reduce((sum, p) => sum + p.points, 0),
      teams: p1Picks,
    },
    player2: {
      playerId: player2.id,
      playerName: player2.name,
      totalPoints: p2Picks.reduce((sum, p) => sum + p.points, 0),
      teams: p2Picks,
    },
    sharedTeams,
    uniqueToPlayer1: uniqueToP1,
    uniqueToPlayer2: uniqueToP2,
  });
}
