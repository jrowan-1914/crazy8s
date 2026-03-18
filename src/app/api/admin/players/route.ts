import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { v4 as uuid } from "uuid";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const players = await prisma.user.findMany({
    where: { role: "player" },
    include: {
      picks: { include: { team: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name, email } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Auto-generate a unique placeholder email if not provided
  const playerEmail = email || `${name.toLowerCase().replace(/\s+/g, ".")}.${Date.now()}@player.local`;

  const existing = await prisma.user.findUnique({ where: { email: playerEmail } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const player = await prisma.user.create({
    data: {
      name,
      email: playerEmail,
      role: "player",
      accessToken: uuid(),
    },
  });

  return NextResponse.json(player, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Player ID is required" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
