import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teams = await prisma.team.findMany();

  const picks = await prisma.pick.findMany({
    include: {
      user: true,
    },
  });

  const totalPlayers = await prisma.user.count({
    where: { role: "player", picksSubmitted: true },
  });

  // Build a map of teamId -> { count, playerNames }
  const teamPickMap: Record<string, { count: number; playerNames: string[] }> = {};
  for (const pick of picks) {
    if (!teamPickMap[pick.teamId]) {
      teamPickMap[pick.teamId] = { count: 0, playerNames: [] };
    }
    teamPickMap[pick.teamId].count++;
    teamPickMap[pick.teamId].playerNames.push(pick.user.name);
  }

  const result = teams.map((team) => {
    const pickData = teamPickMap[team.id] || { count: 0, playerNames: [] };
    return {
      teamId: team.id,
      teamName: team.name,
      seed: team.seed,
      region: team.region,
      logoUrl: team.logoUrl,
      eliminated: team.eliminated,
      pickedBy: pickData.count,
      totalPlayers,
      percentage: totalPlayers > 0
        ? Math.round((pickData.count / totalPlayers) * 10000) / 100
        : 0,
      playerNames: pickData.playerNames,
    };
  });

  result.sort((a, b) => b.pickedBy - a.pickedBy);

  return NextResponse.json({ teams: result });
}
