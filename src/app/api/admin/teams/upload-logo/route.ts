import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const teamId = formData.get("teamId") as string | null;

  if (!file || !teamId) {
    return NextResponse.json({ error: "File and teamId are required" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "image/png";
  const logoUrl = `data:${mimeType};base64,${base64}`;

  await prisma.team.update({
    where: { id: teamId },
    data: { logoUrl },
  });

  return NextResponse.json({ logoUrl });
}
