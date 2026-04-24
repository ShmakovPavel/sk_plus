import { subDays, subMonths, subYears } from "date-fns";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuizQuestions } from "@/lib/quiz";
import { QuizGame } from "@/components/QuizGame";

function tagFromUser(firstName: string, id: string) {
  const tail = id.replace(/[^0-9]/g, "").slice(-5).padStart(5, "0");
  return `${firstName}#${tail}`;
}

async function getRanking(startDate?: Date) {
  return prisma.quizAttempt.groupBy({
    by: ["userId"],
    _sum: { score: true },
    where: startDate ? { createdAt: { gte: startDate } } : {},
    orderBy: { _sum: { score: "desc" } },
    take: 50,
  });
}

export default async function QuizPage() {
  const user = await requireUser();
  const launch = await prisma.quizLaunch.findFirst({ orderBy: { createdAt: "desc" } });
  const questions = await getQuizQuestions(launch?.questionCount);

  const [daily, monthly, yearly, allTime] = await Promise.all([
    getRanking(subDays(new Date(), 1)),
    getRanking(subMonths(new Date(), 1)),
    getRanking(subYears(new Date(), 1)),
    getRanking(),
  ]);

  const userIds = [...new Set([...daily, ...monthly, ...yearly, ...allTime].map((r) => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.firstName]));

  const userTag = tagFromUser(user.firstName, user.id);

  const rankingBlocks = [
    { title: "Ежедневный", data: daily },
    { title: "Ежемесячный", data: monthly },
    { title: "Ежегодный", data: yearly },
    { title: "За все время", data: allTime },
  ];

  return (
    <div className="space-y-4">
      <QuizGame
        userTag={userTag}
        questions={questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: [q.optionA, q.optionB, q.optionC, q.optionD],
          correctIndex: q.correctIndex,
          category: q.category,
        }))}
      />

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Рейтинги TOP-50</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {rankingBlocks.map((block) => (
            <article key={block.title} className="rounded-md border border-zinc-200 p-3">
              <h3 className="font-medium">{block.title}</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {block.data.map((row, idx) => (
                  <li key={row.userId}>
                    {idx + 1}. {tagFromUser(userMap.get(row.userId) ?? "Игрок", row.userId)} —{" "}
                    {row._sum.score ?? 0} очков
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
