import { NextResponse } from "next/server";
import { ensureDailyQuizLaunch } from "@/lib/quizSchedule";

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await ensureDailyQuizLaunch();
  return NextResponse.json({
    ok: true,
    launchedNow: result.launchedNow,
    launchId: result.launch?.id ?? null,
  });
}
