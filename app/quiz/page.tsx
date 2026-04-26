import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMoscowDateKey, getNextLaunchDate, getQuizSettings } from "@/lib/quizSchedule";
import { getLaunchWithQuestionsByDateKey } from "@/lib/quizLaunch";
import { QuizGame } from "@/components/QuizGame";
import { QuizLaunchCountdown } from "@/components/QuizLaunchCountdown";

function tagFromUser(firstName: string, id: string) {
  const tail = id.replace(/[^0-9]/g, "").slice(-5).padStart(5, "0");
  return `${firstName}#${tail}`;
}

type RankingWindow = {
  from?: Date;
  to?: Date;
};

function getMoscowDayStart(now: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const values = new Map(parts.map((p) => [p.type, p.value]));
  const year = Number(values.get("year") ?? "1970");
  const month = Number(values.get("month") ?? "1");
  const day = Number(values.get("day") ?? "1");
  return new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
}

async function getRanking(window: RankingWindow = {}) {
  const { from, to } = window;
  const attemptsWhere = from || to
    ? {
        ...(from ? { createdAt: { gte: from } } : {}),
        ...(to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                lt: to,
              },
            }
          : {}),
      }
    : undefined;

  const users = await prisma.user.findMany({
    where: {
      isAdmin: false,
    },
    select: {
      id: true,
      firstName: true,
      attempts: {
        where: attemptsWhere,
        select: { score: true },
      },
    },
  });

  return users
    .map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      score: u.attempts.reduce((sum, a) => sum + a.score, 0),
    }))
    .sort((a, b) => b.score - a.score || a.firstName.localeCompare(b.firstName, "ru"))
    .slice(0, 50);
}

function rankingPlaceBadge(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}.`;
}

function rankingRowClass(index: number) {
  if (index === 0) return "bg-yellow-500/15 border-yellow-500/35";
  if (index === 1) return "bg-slate-300/20 border-slate-400/35";
  if (index === 2) return "bg-amber-700/15 border-amber-700/35";
  return "border-transparent";
}

function currentUserRowClass(isCurrentUser: boolean) {
  return isCurrentUser ? "ring-2 ring-[var(--accent)]/50 bg-[var(--accent)]/10" : "";
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const settings = await getQuizSettings();
  const nextLaunchAt = getNextLaunchDate(settings);
  const launch = await getLaunchWithQuestionsByDateKey(getMoscowDateKey());
  const hasQuestions = Boolean(launch && launch.questions.length);
  const shouldShowGame = Boolean(hasQuestions && query.live === "1");
  const activeLaunchId = hasQuestions && launch ? launch.id : null;
  const dayStart = getMoscowDayStart();
  const monthStart = new Date(dayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearStart = new Date(dayStart.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [daily, monthly, yearly, allTime] = await Promise.all([
    getRanking({ from: dayStart }),
    getRanking({ from: monthStart, to: dayStart }),
    getRanking({ from: yearStart, to: monthStart }),
    getRanking(),
  ]);

  const rankingBlocks = [
    { title: "Ежедневный", data: daily },
    { title: "Ежемесячный", data: monthly },
    { title: "Ежегодный", data: yearly },
    { title: "За все время", data: allTime },
  ];

  return (
    <div className="space-y-4">
      {shouldShowGame ? (
        <QuizGame
          key={activeLaunchId!}
          launchId={activeLaunchId!}
        />
      ) : (
        <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{launch ? "Игра уже идёт!" : "Викторина скоро начнётся"}</h2>
          {launch ? (
            <>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Нажми кнопку и подключайся к общему раунду с другими игроками.
              </p>
              <Link
                href="/quiz?live=1"
                className="mt-3 inline-flex rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Войти в игру
              </Link>
              <p className="mt-2 text-xs text-[var(--muted)]">Подключаем автоматически, если раунд уже активен.</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Викторина проходит каждый день в 7 вечера по Москве.
            </p>
          )}
          <QuizLaunchCountdown
            launchAtIso={nextLaunchAt.toISOString()}
            currentLaunchId={launch?.id ?? null}
            showTimer={!launch}
          />
        </section>
      )}

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Рейтинги TOP-50</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {rankingBlocks.map((block) => (
            <article key={block.title} className="rounded-md border border-[var(--surface-border)]/80 p-3">
              <h3 className="font-medium">{block.title}</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {block.data.slice(0, 3).map((row, idx) => (
                  <li
                    key={row.userId}
                    className={`rounded-md border px-2 py-1 ${rankingRowClass(idx)} ${currentUserRowClass(row.userId === user.id)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="mr-1">{rankingPlaceBadge(idx)}</span>
                        {tagFromUser(row.firstName ?? "Игрок", row.userId)}
                      </span>
                      <span className="shrink-0 text-right font-medium tabular-nums">{row.score}</span>
                    </div>
                  </li>
                ))}
              </ol>
              {block.data.length > 3 ? (
                <details className="mt-2 rounded-md border border-[var(--surface-border)]/70 p-2">
                  <summary className="cursor-pointer text-sm text-[var(--muted)]">
                    Показать остальных ({block.data.length - 3})
                  </summary>
                  <ol className="mt-2 space-y-1 text-sm">
                    {block.data.slice(3).map((row, idx) => {
                      const place = idx + 3;
                      return (
                        <li
                          key={row.userId}
                          className={`rounded-md px-2 py-1 ${currentUserRowClass(row.userId === user.id)}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">
                              <span className="mr-1">{rankingPlaceBadge(place)}</span>
                              {tagFromUser(row.firstName ?? "Игрок", row.userId)}
                            </span>
                            <span className="shrink-0 text-right font-medium tabular-nums">{row.score}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
