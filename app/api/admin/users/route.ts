import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Только администратор" }, { status: 403 });
  const body = await req.json();
  const { userId, firstName, lastName, isBlocked, isAdmin } = body as {
    userId?: string;
    firstName?: string;
    lastName?: string;
    isBlocked?: boolean;
    isAdmin?: boolean;
  };

  if (!userId) return NextResponse.json({ error: "userId обязателен" }, { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(isBlocked !== undefined ? { isBlocked } : {}),
      ...(isAdmin !== undefined ? { isAdmin } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
