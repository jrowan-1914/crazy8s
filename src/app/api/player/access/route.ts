import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Validate a player access token
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const player = await prisma.user.findUnique({
    where: { accessToken: token },
    select: {
      id: true,
      name: true,
      email: true,
      picksSubmitted: true,
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Invalid access token" }, { status: 404 });
  }

  return NextResponse.json(player);
}
