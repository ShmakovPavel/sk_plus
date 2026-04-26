import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "@/components/AdminPanel";
import { getMoscowDateKey, getQuizSettings } from "@/lib/quizSchedule";

export default async function AdminPage() {
  await requireAdmin();

  const [users, questions, quizSettings, todayLaunch] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isAdmin: true,
        isBlocked: true,
      },
    }),
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    getQuizSettings(),
    prisma.quizLaunch.findFirst({
      where: { launchDateKey: getMoscowDateKey(), startedBy: { isAdmin: true } },
      select: { id: true },
    }),
  ]);

  return (
    <AdminPanel
      users={users}
      questions={questions}
      quizSettings={{
        dailyLaunchHour: quizSettings.dailyLaunchHour,
        dailyLaunchMinute: quizSettings.dailyLaunchMinute,
        questionCount: quizSettings.questionCount,
      }}
      isQuizLaunchedToday={Boolean(todayLaunch)}
    />
  );
}
