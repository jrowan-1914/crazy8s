import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getPlayer(req: NextRequest) {
  // Check for token-based access first
  const token = req.headers.get("x-access-token");
  if (token) {
    return prisma.user.findUnique({ where: { accessToken: token } });
  }

  // Fall back to session-based auth
  const session = await auth();
  if (session?.user?.id) {
    return prisma.user.findUnique({ where: { id: session.user.id } });
  }

  return null;
}

export async function GET(req: NextRequest) {
  const player = await getPlayer(req);
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const picks = await prisma.pick.findMany({
    where: { userId: player.id },
    include: {
      team: {
        include: {
          wins: true,
        },
      },
    },
  });

  return NextResponse.json({
    picks,
    picksSubmitted: player.picksSubmitted,
  });
}

export async function POST(req: NextRequest) {
  const player = await getPlayer(req);
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if picks are locked
  const settings = await prisma.settings.findUnique({ where: { id: "global" } });
  if (settings?.picksLocked) {
    return NextResponse.json({ error: "Picks are locked" }, { status: 403 });
  }

  if (player.picksSubmitted) {
    return NextResponse.json({ error: "Picks already submitted" }, { status: 409 });
  }

  const { teamIds } = await req.json();

  if (!Array.isArray(teamIds) || teamIds.length !== 8) {
    return NextResponse.json({ error: "Exactly 8 team IDs are required" }, { status: 400 });
  }

  // Verify all teams exist
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
  });
  if (teams.length !== 8) {
    return NextResponse.json({ error: "One or more invalid team IDs" }, { status: 400 });
  }

  // Create picks in a transaction
  await prisma.$transaction([
    // Delete any existing picks (shouldn't exist, but just in case)
    prisma.pick.deleteMany({ where: { userId: player.id } }),
    // Create new picks
    ...teamIds.map((teamId: string) =>
      prisma.pick.create({
        data: { userId: player.id, teamId },
      })
    ),
    // Mark picks as submitted
    prisma.user.update({
      where: { id: player.id },
      data: { picksSubmitted: true },
    }),
  ]);

  return NextResponse.json({ success: true }, { status: 201 });
}
