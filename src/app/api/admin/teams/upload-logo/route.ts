import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

  // Save to public/logos directory
  const logosDir = path.join(process.cwd(), "public", "logos");
  await mkdir(logosDir, { recursive: true });

  const ext = file.name.split(".").pop() || "png";
  const filename = `${teamId}.${ext}`;
  const filepath = path.join(logosDir, filename);

  await writeFile(filepath, buffer);

  const logoUrl = `/logos/${filename}`;

  await prisma.team.update({
    where: { id: teamId },
    data: { logoUrl },
  });

  return NextResponse.json({ logoUrl });
}
