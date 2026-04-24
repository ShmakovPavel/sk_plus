import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const body = await req.json();
  const score = Number(body.score ?? 0);
  const totalQuestions = Number(body.totalQuestions ?? 0);
  const correctAnswers = Number(body.correctAnswers ?? 0);

  if (totalQuestions <= 0) {
    return NextResponse.json({ error: "totalQuestions обязателен" }, { status: 400 });
  }

  await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      score,
      totalQuestions,
      correctAnswers,
    },
  });

  return NextResponse.json({ ok: true });
}
