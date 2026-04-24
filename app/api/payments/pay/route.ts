import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const body = await req.json();
  const service = body.service as string | undefined;
  const amount = Number(body.amount ?? 0);

  if (!service || amount <= 0) {
    return NextResponse.json({ error: "Укажите сервис и сумму" }, { status: 400 });
  }

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  if (fresh.balance < amount) {
    return NextResponse.json({ error: "Недостаточно средств" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.payment.create({
      data: {
        userId: user.id,
        service,
        amount,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
