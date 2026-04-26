import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentsPanel } from "@/components/PaymentsPanel";

export default async function PaymentsPage() {
  const user = await requireUser();
  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const accountHints = await prisma.payment.findMany({
    where: { userId: user.id, NOT: { account: "" } },
    select: { service: true, account: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const accountsByService: Record<string, string[]> = {};
  for (const item of accountHints) {
    if (!accountsByService[item.service]) accountsByService[item.service] = [];
    if (!accountsByService[item.service].includes(item.account)) {
      accountsByService[item.service].push(item.account);
    }
  }

  const childPayments =
    user.role === "PARENT"
      ? await prisma.payment.findMany({
          where: {
            user: {
              childLinks: {
                some: {
                  parentId: user.id,
                  status: "APPROVED",
                },
              },
            },
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 40,
        })
      : [];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Платежи и онлайн сервисы</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Баланс аккаунта: <span className="font-semibold">{user.balance.toLocaleString("ru-RU")} ₽</span>
        </p>
      </section>

      <PaymentsPanel accountsByService={accountsByService} />

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">История операций</h2>
        <ul className="space-y-2 text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border border-[var(--surface-border)]/80 p-2">
              <span>
                {p.service} {p.account ? `(${p.account})` : ""}
              </span>
              <span>{p.amount.toLocaleString("ru-RU")} ₽</span>
            </li>
          ))}
        </ul>
      </section>

      {user.role === "PARENT" ? (
        <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">История операций детей</h2>
          {childPayments.length ? (
            <ul className="space-y-2 text-sm">
              {childPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border border-[var(--surface-border)]/80 p-2">
                  <span>
                    {p.user.firstName} {p.user.lastName}: {p.service} {p.account ? `(${p.account})` : ""}
                  </span>
                  <span>{p.amount.toLocaleString("ru-RU")} ₽</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">У детей пока нет операций.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
