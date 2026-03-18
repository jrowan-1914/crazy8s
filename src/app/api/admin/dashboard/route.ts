import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Run queries sequentially to avoid exhausting the single DB connection
  const teamCount = await prisma.team.count();
  const playerCount = await prisma.user.count({ where: { role: "player" } });
  const picksSubmittedCount = await prisma.user.count({ where: { role: "player", picksSubmitted: true } });
  const resultCount = await prisma.gameResult.count();
  const settings = await prisma.settings.findUnique({ where: { id: "global" } });

  return NextResponse.json({
    teamCount,
    playerCount,
    picksSubmittedCount,
    resultCount,
    picksLocked: settings?.picksLocked ?? false,
  });
}
