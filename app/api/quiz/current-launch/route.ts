import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLaunchWithQuestionsByDateKey } from "@/lib/quizLaunch";
import { getMoscowDateKey } from "@/lib/quizSchedule";
import { QUIZ_QUESTION_DURATION_SECONDS } from "@/lib/quizLive";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const launch = await getLaunchWithQuestionsByDateKey(getMoscowDateKey());
  const totalQuestions = launch?.questions.length ?? 0;
  const finishAtMs =
    launch && totalQuestions
      ? launch.createdAt.getTime() + totalQuestions * QUIZ_QUESTION_DURATION_SECONDS * 1000
      : null;
  const isFinished = finishAtMs ? Date.now() >= finishAtMs : false;

  return NextResponse.json({
    launchAvailable: Boolean(launch && totalQuestions > 0 && !isFinished),
    isFinished,
    launchId: launch?.id ?? null,
  });
}
