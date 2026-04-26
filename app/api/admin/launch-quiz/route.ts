import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMoscowDateKey, getQuizSettings } from "@/lib/quizSchedule";
import { createQuizLaunch } from "@/lib/quizLaunch";

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!admin.isAdmin) return NextResponse.json({ error: "Только администратор" }, { status: 403 });
  const body = await req.json();
  const settings = await getQuizSettings();
  const questionCount = Number(body.questionCount ?? settings.questionCount);

  if (questionCount < 5 || questionCount > 50) {
    return NextResponse.json({ error: "Количество вопросов: от 5 до 50" }, { status: 400 });
  }

  const { created } = await createQuizLaunch({
    startedById: admin.id,
    questionCount,
    launchDateKey: getMoscowDateKey(),
  });
  if (!created) {
    return NextResponse.json({ error: "Сегодняшний раунд уже запущен" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
