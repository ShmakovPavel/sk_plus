import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuizQuestions } from "@/lib/quiz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const latestLaunch = await prisma.quizLaunch.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const questions = await getQuizQuestions(latestLaunch?.questionCount);

  return NextResponse.json(
    questions.map((q) => ({
      id: q.id,
      text: q.text,
      category: q.category,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctIndex: q.correctIndex,
    })),
  );
}
