import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: [{ region: "asc" }, { seed: "asc" }],
  });

  // Group by region
  const byRegion: Record<string, typeof teams> = {};
  for (const team of teams) {
    if (!byRegion[team.region]) byRegion[team.region] = [];
    byRegion[team.region].push(team);
  }

  return NextResponse.json({ teams, byRegion });
}
