import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLaunchWithQuestionsByDateKey } from "@/lib/quizLaunch";
import { getMoscowDateKey } from "@/lib/quizSchedule";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const latestLaunch = await getLaunchWithQuestionsByDateKey(getMoscowDateKey());

  const questions = latestLaunch?.questions.map((item) => item.question) ?? [];

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
