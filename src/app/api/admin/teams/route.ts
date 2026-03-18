import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: [{ region: "asc" }, { seed: "asc" }],
  });

  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { teams } = await req.json();

  if (!Array.isArray(teams)) {
    return NextResponse.json({ error: "Expected an array of teams" }, { status: 400 });
  }

  // Validate each team
  for (const team of teams) {
    if (!team.name || !team.seed || !team.region) {
      return NextResponse.json(
        { error: "Each team needs name, seed, and region" },
        { status: 400 }
      );
    }
    if (team.seed < 1 || team.seed > 16) {
      return NextResponse.json(
        { error: `Invalid seed ${team.seed} for ${team.name}` },
        { status: 400 }
      );
    }
  }

  // Upsert teams sequentially in a transaction to avoid connection exhaustion
  const results = await prisma.$transaction(
    teams.map((team: { name: string; seed: number; region: string; logoUrl?: string }) =>
      prisma.team.upsert({
        where: { region_seed: { region: team.region, seed: team.seed } },
        update: { name: team.name },
        create: {
          name: team.name,
          seed: team.seed,
          region: team.region,
          logoUrl: team.logoUrl || null,
        },
      })
    )
  );

  return NextResponse.json(results);
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id, ...data } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
  }

  const team = await prisma.team.update({
    where: { id },
    data,
  });

  return NextResponse.json(team);
}
