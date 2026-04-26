import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuizRuntimeForUser } from "@/lib/quizLive";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const url = new URL(req.url);
  const launchId = url.searchParams.get("launchId");
  if (!launchId) {
    return NextResponse.json({ error: "launchId обязателен" }, { status: 400 });
  }

  const runtime = await getQuizRuntimeForUser(launchId, user.id);
  if (runtime.status === "not_found") {
    return NextResponse.json({ status: "not_found" });
  }

  if (runtime.status === "finished") {
    return NextResponse.json(runtime);
  }

  return NextResponse.json({
    ...runtime,
    question: {
      id: runtime.question.id,
      text: runtime.question.text,
      category: runtime.question.category,
      options: runtime.question.options,
    },
  });
}
