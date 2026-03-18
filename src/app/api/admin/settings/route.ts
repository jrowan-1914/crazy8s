import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: "global" } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "global" } });
  }
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const data = await req.json();

  const settings = await prisma.settings.upsert({
    where: { id: "global" },
    update: data,
    create: { id: "global", ...data },
  });

  return NextResponse.json(settings);
}
