import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { mode } = await req.json();

  if (mode === "season") {
    // Reset game but keep teams: clear results, picks, reset player pick status, unlock picks, un-eliminate teams
    await prisma.$transaction([
      prisma.gameResult.deleteMany(),
      prisma.pick.deleteMany(),
      prisma.user.updateMany({
        where: { role: "player" },
        data: { picksSubmitted: false },
      }),
      prisma.team.updateMany({
        data: { eliminated: false },
      }),
      prisma.settings.update({
        where: { id: "global" },
        data: { picksLocked: false },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Season reset. Teams kept, all results and picks cleared." });
  }

  if (mode === "full") {
    // Nuke everything except the admin user
    await prisma.$transaction([
      prisma.gameResult.deleteMany(),
      prisma.pick.deleteMany(),
      prisma.team.deleteMany(),
      prisma.user.deleteMany({ where: { role: "player" } }),
      prisma.settings.update({
        where: { id: "global" },
        data: { picksLocked: false },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Full reset. All teams, players, results, and picks cleared." });
  }

  return NextResponse.json({ error: "Invalid mode. Use 'season' or 'full'." }, { status: 400 });
}
