import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stopQuizLaunchByDateKey } from "@/lib/quizLaunch";
import { getMoscowDateKey } from "@/lib/quizSchedule";

export async function POST() {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!admin.isAdmin) return NextResponse.json({ error: "Только администратор" }, { status: 403 });

  const deleted = await stopQuizLaunchByDateKey(getMoscowDateKey());
  if (!deleted) {
    return NextResponse.json({ error: "Сейчас нет активного раунда" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
