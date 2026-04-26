import Link from "next/link";
import { UserRole } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const user = await requireUser();
  const myChildIds =
    user.role === UserRole.PARENT
      ? (
          await prisma.familyLink.findMany({
            where: { parentId: user.id, status: "APPROVED" },
            select: { childId: true },
          })
        ).map((l) => l.childId)
      : [user.id];

  const goals = await prisma.goal.findMany({
    where: { childId: { in: myChildIds } },
    include: {
      child: true,
      stages: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const activeGoal = goals.find((goal) => goal.stages.some((stage) => stage.status !== "DONE"));
  const goalsToShow =
    user.role === UserRole.PARENT
      ? (() => {
          const byChild = new Map<string, (typeof goals)[number]>();
          for (const goal of goals) {
            if (byChild.has(goal.childId)) continue;
            if (!goal.stages.some((stage) => stage.status !== "DONE")) continue;
            byChild.set(goal.childId, goal);
          }
          return Array.from(byChild.values());
        })()
      : activeGoal
        ? [activeGoal]
        : [];

  const pendingLinks = await prisma.familyLink.findMany({
    where:
      user.role === UserRole.PARENT
        ? { parentId: user.id, status: "PENDING" }
        : { childId: user.id, status: "PENDING" },
    include: { parent: true, child: true },
  });

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold">
            {user.firstName} {user.lastName}
            <span
              className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--soft-text)]"
              title={user.role === "PARENT" ? "Родитель" : "Ребёнок"}
              aria-label={user.role === "PARENT" ? "Родитель" : "Ребёнок"}
            >
              {user.role === "PARENT" ? (
                <span aria-hidden="true">👨</span>
              ) : (
                <span aria-hidden="true">🧒</span>
              )}
            </span>
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">Баланс</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{user.balance.toLocaleString("ru-RU")} ₽</p>
        </div>
      </section>

      {pendingLinks.length ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 className="font-semibold">Ожидают подтверждения семейные связи</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {pendingLinks.map((link) => (
              <li key={link.id}>
                {link.parent.firstName} {link.parent.lastName} <span className="mx-1">↔</span>
                {link.child.firstName} {link.child.lastName}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Цели</h2>
        <div className="space-y-4">
          {goalsToShow.length ? (
            goalsToShow.map((goal) => {
              const firstOpenStage = goal.stages.find((stage) => stage.status !== "DONE") ?? null;
              const completed = goal.stages.filter((s) => s.status === "DONE").length;
              const progress = Math.round((completed / Math.max(goal.stages.length, 1)) * 100);
              return (
                <article key={goal.id} className="rounded-lg border border-[var(--surface-border)]/80 bg-[var(--surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="flex items-center gap-2 font-medium text-[var(--foreground)]">
                        <span aria-hidden="true">⏳</span>
                        {goal.title}
                      </h3>
                      {user.role === "PARENT" ? (
                        <p className="text-sm text-[var(--muted)]">
                          {goal.child.firstName} {goal.child.lastName}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-sm text-[var(--muted)]">{goal.totalAmount.toLocaleString("ru-RU")} ₽</div>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--soft)]">
                    <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)]" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">Прогресс: {progress}%</p>
                  {firstOpenStage ? (
                    <div className="mt-3 rounded-md border border-[var(--surface-border)]/80 bg-[var(--soft)] p-3">
                      <p className="text-xs font-medium text-[var(--muted)]">Текущий этап</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
                        {firstOpenStage.status === "WAITING_APPROVAL" ? <span aria-hidden="true">⏳</span> : null}
                        {firstOpenStage.orderIndex}. {firstOpenStage.title}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{firstOpenStage.amount.toLocaleString("ru-RU")} ₽</p>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="text-sm text-[var(--muted)]">Нет активных целей. Создайте новую на странице целей.</p>
          )}
          <div className="text-sm text-[var(--muted)]">
            Подробнее в{" "}
            <Link
              href="/goals"
              className="inline-flex rounded-md bg-[var(--accent)] px-2 py-1 text-xs text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              целях
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Оплата любимых игр</h2>
        <p className="text-sm text-[var(--muted)]">Steam, Roblox, игровые сервисы и подписки</p>
        <div className="mt-4 flex justify-center">
          <Link
            href="/payments"
            className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Оплатить
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Игры</h2>
        <div className="grid gap-3">
          <Link
            href="/quiz"
            className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Викторина
          </Link>
          <div className="text-center">
            <button
              type="button"
              disabled
              className="inline-flex w-full items-center justify-center rounded-md bg-[var(--soft)] px-4 py-2 text-sm text-[var(--muted)] opacity-70"
            >
              Веселые старты
            </button>
            <p className="mt-1 text-xs text-[var(--muted)]">Скоро</p>
          </div>
        </div>
      </section>
    </div>
  );
}
