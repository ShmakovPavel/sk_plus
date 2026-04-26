import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!admin.isAdmin) return NextResponse.json({ error: "Только администратор" }, { status: 403 });

  const body = await req.json();
  const dailyLaunchHour = Number(body.dailyLaunchHour);
  const dailyLaunchMinute = Number(body.dailyLaunchMinute);
  const questionCount = Number(body.questionCount ?? 15);

  if (dailyLaunchHour < 0 || dailyLaunchHour > 23 || dailyLaunchMinute < 0 || dailyLaunchMinute > 59) {
    return NextResponse.json({ error: "Время запуска должно быть в формате HH:MM" }, { status: 400 });
  }
  if (questionCount < 5 || questionCount > 50) {
    return NextResponse.json({ error: "Количество вопросов: от 5 до 50" }, { status: 400 });
  }

  await prisma.quizSettings.upsert({
    where: { id: 1 },
    update: { dailyLaunchHour, dailyLaunchMinute, questionCount },
    create: { id: 1, dailyLaunchHour, dailyLaunchMinute, questionCount },
  });

  return NextResponse.json({ ok: true });
}
