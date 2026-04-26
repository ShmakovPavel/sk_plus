import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuizRuntimeForUser } from "@/lib/quizLive";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json();
  const launchId = String(body.launchId ?? "");
  const questionId = String(body.questionId ?? "");
  const optionIndex = Number(body.optionIndex);
  if (!launchId || !questionId || Number.isNaN(optionIndex)) {
    return NextResponse.json({ error: "launchId, questionId и optionIndex обязательны" }, { status: 400 });
  }

  const runtime = await getQuizRuntimeForUser(launchId, user.id);
  if (runtime.status === "not_found") {
    return NextResponse.json({ error: "Раунд не найден" }, { status: 404 });
  }
  if (runtime.status === "finished") {
    return NextResponse.json({ ok: false, finished: true });
  }
  if (runtime.question.id !== questionId) {
    return NextResponse.json({ ok: false, stale: true, message: "Вопрос уже сменился" });
  }
  if (runtime.hasAnsweredCurrentCorrectly) {
    return NextResponse.json({ ok: true, alreadyCorrect: true });
  }
  if (optionIndex !== runtime.question.correctIndex) {
    return NextResponse.json({ ok: true, correct: false });
  }

  const points = 50 + runtime.remainingSeconds * 10;
  try {
    await prisma.quizLaunchAnswer.create({
      data: {
        launchId,
        questionId,
        userId: user.id,
        points,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  return NextResponse.json({ ok: true, correct: true, points });
}
