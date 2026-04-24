import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (user.role !== UserRole.PARENT && !user.isAdmin) {
    return NextResponse.json({ error: "Только родитель подтверждает этапы" }, { status: 403 });
  }

  const body = await req.json();
  const stageId = body.stageId as string | undefined;
  if (!stageId) return NextResponse.json({ error: "stageId обязателен" }, { status: 400 });

  const stage = await prisma.goalStage.findUnique({
    where: { id: stageId },
    include: { goal: true },
  });
  if (!stage) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });
  if (stage.status !== "WAITING_APPROVAL") {
    return NextResponse.json({ error: "Этап не ожидает подтверждения" }, { status: 400 });
  }

  const approvedLink = await prisma.familyLink.findFirst({
    where: {
      childId: stage.goal.childId,
      status: "APPROVED",
      parentId: user.id,
    },
  });

  if (!approvedLink && !user.isAdmin) {
    return NextResponse.json({ error: "Нет прав на подтверждение этого этапа" }, { status: 403 });
  }

  const child = await prisma.user.findUnique({ where: { id: stage.goal.childId } });
  if (!child) return NextResponse.json({ error: "Ребенок не найден" }, { status: 404 });

  const parentId = approvedLink?.parentId ?? user.id;
  const parent = await prisma.user.findUnique({ where: { id: parentId } });
  if (!parent) return NextResponse.json({ error: "Родитель не найден" }, { status: 404 });
  if (parent.balance < stage.amount) {
    return NextResponse.json({ error: "Недостаточно средств у родителя" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: parent.id },
      data: { balance: { decrement: stage.amount } },
    }),
    prisma.user.update({
      where: { id: child.id },
      data: { balance: { increment: stage.amount } },
    }),
    prisma.goalStage.update({
      where: { id: stage.id },
      data: { status: "DONE", rewardedAt: new Date() },
    }),
  ]);

  const unfinished = await prisma.goalStage.count({
    where: { goalId: stage.goalId, status: { not: "DONE" } },
  });
  if (unfinished === 0) {
    await prisma.goal.update({ where: { id: stage.goalId }, data: { status: "COMPLETED" } });
  }

  return NextResponse.json({ ok: true });
}
