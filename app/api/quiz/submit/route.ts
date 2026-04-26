import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const body = await req.json();
  const launchId = String(body.launchId ?? "");
  if (!launchId) {
    return NextResponse.json({ error: "launchId обязателен" }, { status: 400 });
  }

  const launch = await prisma.quizLaunch.findFirst({
    where: {
      id: launchId,
      startedBy: { isAdmin: true },
    },
    select: {
      id: true,
      questions: { select: { id: true } },
    },
  });
  if (!launch) {
    return NextResponse.json({ error: "Раунд не найден" }, { status: 404 });
  }

  const totals = await prisma.quizLaunchAnswer.aggregate({
    where: { launchId, userId: user.id },
    _sum: { points: true },
    _count: { _all: true },
  });
  const score = totals._sum.points ?? 0;
  const correctAnswers = totals._count._all;
  const totalQuestions = launch.questions.length;

  await prisma.quizAttempt.upsert({
    where: {
      launchId_userId: {
        launchId,
        userId: user.id,
      },
    },
    create: {
      launchId,
      userId: user.id,
      score,
      totalQuestions,
      correctAnswers,
    },
    update: {
      score,
      totalQuestions,
      correctAnswers,
    },
  });

  return NextResponse.json({ ok: true, score, correctAnswers, totalQuestions });
}
