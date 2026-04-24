import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StageInput = { title: string; amount: number };

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const body = await req.json();
  const { title, description, childId, stages } = body as {
    title?: string;
    description?: string;
    childId?: string;
    stages?: StageInput[];
  };

  if (!title || !description || !childId || !Array.isArray(stages) || stages.length === 0) {
    return NextResponse.json({ error: "Заполните цель и этапы" }, { status: 400 });
  }

  const totalAmount = stages.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  if (totalAmount <= 0) {
    return NextResponse.json({ error: "Сумма этапов должна быть > 0" }, { status: 400 });
  }

  const link = await prisma.familyLink.findFirst({
    where: {
      status: "APPROVED",
      OR: [
        { parentId: user.id, childId },
        { parentId: childId, childId: user.id },
      ],
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Нет подтверждённой семейной связи" }, { status: 403 });
  }

  await prisma.goal.create({
    data: {
      title,
      description,
      childId,
      createdById: user.id,
      totalAmount,
      stages: {
        create: stages.map((s, index) => ({
          title: s.title,
          amount: Number(s.amount),
          orderIndex: index + 1,
        })),
      },
    },
  });

  return NextResponse.json({ ok: true });
}
