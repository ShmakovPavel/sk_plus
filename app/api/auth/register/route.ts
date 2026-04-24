import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, firstName, lastName, role } = body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
  };

  if (!email || !password || !firstName || !lastName || !role) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Пароль минимум 8 символов" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Пользователь уже существует" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      firstName,
      lastName,
      role,
      balance: role === UserRole.PARENT ? 100000 : 0,
    },
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
