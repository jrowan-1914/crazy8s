import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildFullBracket, getPendingMatchups } from "@/lib/bracket";

export async function GET() {
  // Sequential queries to avoid exhausting the single DB connection
  const teams = await prisma.team.findMany({
    orderBy: [{ region: "asc" }, { seed: "asc" }],
  });
  const results = await prisma.gameResult.findMany({
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
  });

  const teamInfos = teams.map((t) => ({
    id: t.id,
    name: t.name,
    seed: t.seed,
    region: t.region,
    eliminated: t.eliminated,
    logoUrl: t.logoUrl,
  }));

  const resultInfos = results.map((r) => ({
    id: r.id,
    round: r.round,
    winningTeamId: r.winningTeamId,
    losingTeamId: r.losingTeamId,
  }));

  const bracket = buildFullBracket(teamInfos, resultInfos);
  const pending = getPendingMatchups(teamInfos, resultInfos);

  return NextResponse.json({ bracket, pending, results: resultInfos });
}
