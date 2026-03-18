import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { author, message } = body;

  if (
    !author ||
    typeof author !== "string" ||
    author.trim().length < 1 ||
    author.trim().length > 30
  ) {
    return NextResponse.json(
      { error: "Author must be between 1 and 30 characters." },
      { status: 400 }
    );
  }

  if (
    !message ||
    typeof message !== "string" ||
    message.trim().length < 1 ||
    message.trim().length > 500
  ) {
    return NextResponse.json(
      { error: "Message must be between 1 and 500 characters." },
      { status: 400 }
    );
  }

  const chatMessage = await prisma.chatMessage.create({
    data: {
      author: author.trim(),
      message: message.trim(),
    },
  });

  return NextResponse.json(chatMessage);
}
