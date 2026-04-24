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

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Платежи и онлайн сервисы</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Баланс аккаунта: <span className="font-semibold">{user.balance.toLocaleString("ru-RU")} ₽</span>
        </p>
      </section>

      <PaymentsPanel />

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">История операций</h2>
        <ul className="space-y-2 text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-2">
              <span>{p.service}</span>
              <span>{p.amount.toLocaleString("ru-RU")} ₽</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
