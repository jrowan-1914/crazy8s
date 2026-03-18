import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const results = await prisma.gameResult.findMany({
    include: {
      winningTeam: true,
      losingTeam: true,
    },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { round, winningTeamId, losingTeamId, gameDate } = await req.json();

  if (!round || !winningTeamId || !losingTeamId) {
    return NextResponse.json(
      { error: "round, winningTeamId, and losingTeamId are required" },
      { status: 400 }
    );
  }

  const result = await prisma.gameResult.create({
    data: {
      round,
      winningTeamId,
      losingTeamId,
      gameDate: gameDate ? new Date(gameDate) : null,
    },
    include: {
      winningTeam: true,
      losingTeam: true,
    },
  });

  // Mark losing team as eliminated
  await prisma.team.update({
    where: { id: losingTeamId },
    data: { eliminated: true },
  });

  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Result ID is required" }, { status: 400 });
  }

  // Get the result to find the losing team
  const result = await prisma.gameResult.findUnique({ where: { id } });
  if (!result) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  // Delete the result
  await prisma.gameResult.delete({ where: { id } });

  // Check if the losing team has any other losses — if not, un-eliminate them
  const otherLosses = await prisma.gameResult.findFirst({
    where: { losingTeamId: result.losingTeamId },
  });
  if (!otherLosses) {
    await prisma.team.update({
      where: { id: result.losingTeamId },
      data: { eliminated: false },
    });
  }

  return NextResponse.json({ success: true });
}
