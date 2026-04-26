import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Введите email и пароль" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  if (user.isBlocked) {
    return NextResponse.json({ error: "Аккаунт заблокирован администратором" }, { status: 403 });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, redirectTo: user.isAdmin ? "/admin" : "/" });
}
