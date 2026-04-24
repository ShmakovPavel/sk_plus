import { NextResponse } from "next/server";
import { QuestionCategory } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Только администратор" }, { status: 403 });
  const body = await req.json();
  const {
    id,
    text,
    options,
    correctIndex,
    category,
    isActive,
  } = body as {
    id?: string;
    text?: string;
    options?: string[];
    correctIndex?: number;
    category?: QuestionCategory;
    isActive?: boolean;
  };

  if (!text || !options || options.length !== 4 || correctIndex === undefined || !category) {
    return NextResponse.json({ error: "Некорректные данные вопроса" }, { status: 400 });
  }

  if (id) {
    await prisma.question.update({
      where: { id },
      data: {
        text,
        optionA: options[0],
        optionB: options[1],
        optionC: options[2],
        optionD: options[3],
        correctIndex,
        category,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  } else {
    await prisma.question.create({
      data: {
        text,
        optionA: options[0],
        optionB: options[1],
        optionC: options[2],
        optionD: options[3],
        correctIndex,
        category,
        isActive: isActive ?? true,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
