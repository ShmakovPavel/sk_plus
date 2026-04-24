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

  const recentPayments = await prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const pendingLinks = await prisma.familyLink.findMany({
    where:
      user.role === UserRole.PARENT
        ? { parentId: user.id, status: "PENDING" }
        : { childId: user.id, status: "PENDING" },
    include: { parent: true, child: true },
  });

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="mt-1 text-zinc-600">
          Роль: {user.role === "PARENT" ? "Родитель" : "Ребёнок"} | Баланс:{" "}
          <span className="font-semibold">{user.balance.toLocaleString("ru-RU")} ₽</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/goals" className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white">
            Перейти в цели
          </Link>
          <Link href="/payments" className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white">
            Оплатить сервисы
          </Link>
          <Link href="/quiz" className="rounded-md bg-violet-600 px-3 py-2 text-sm text-white">
            Открыть викторину
          </Link>
        </div>
      </section>

      {pendingLinks.length ? (
        <section className="rounded-xl bg-amber-50 p-4 shadow-sm">
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

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Текущие цели и этапы</h2>
        <div className="space-y-4">
          {goals.length ? (
            goals.map((goal) => {
              const completed = goal.stages.filter((s) => s.status === "DONE").length;
              const progress = Math.round((completed / Math.max(goal.stages.length, 1)) * 100);
              return (
                <article key={goal.id} className="rounded-lg border border-zinc-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{goal.title}</p>
                    <span className="text-sm text-zinc-500">{goal.child.firstName}</span>
                  </div>
                  <div className="mb-2 h-3 overflow-hidden rounded-full bg-zinc-200">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500">Прогресс: {progress}%</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {goal.stages.map((stage) => (
                      <li key={stage.id}>
                        {stage.orderIndex}. {stage.title} - {stage.amount.toLocaleString("ru-RU")} ₽ ({stage.status})
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })
          ) : (
            <p className="text-sm text-zinc-500">Пока нет целей. Создайте первую на странице целей.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Блок оплаты услуг</h2>
        <p className="text-sm text-zinc-600">Steam, игровые сервисы и подписки оплачиваются на отдельной странице.</p>
        <ul className="mt-3 space-y-1 text-sm">
          {recentPayments.map((p) => (
            <li key={p.id}>
              {p.service} - {p.amount.toLocaleString("ru-RU")} ₽
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
