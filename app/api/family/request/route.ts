import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const body = await req.json();
  const targetUserId = body.targetUserId as string | undefined;

  if (!targetUserId) {
    return NextResponse.json({ error: "Не выбран пользователь" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (user.role === target.role) {
    return NextResponse.json({ error: "Связь возможна только parent-child" }, { status: 400 });
  }

  const parentId = user.role === UserRole.PARENT ? user.id : target.id;
  const childId = user.role === UserRole.CHILD ? user.id : target.id;

  await prisma.familyLink.upsert({
    where: { parentId_childId: { parentId, childId } },
    update: { status: "PENDING" },
    create: { parentId, childId, status: "PENDING" },
  });

  return NextResponse.json({ ok: true });
}
