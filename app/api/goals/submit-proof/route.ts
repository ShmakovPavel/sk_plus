import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const formData = await req.formData();
  const stageId = formData.get("stageId")?.toString();
  const file = formData.get("proof");

  if (!stageId || !(file instanceof File)) {
    return NextResponse.json({ error: "stageId и файл обязательны" }, { status: 400 });
  }

  const stage = await prisma.goalStage.findUnique({
    where: { id: stageId },
    include: {
      goal: true,
    },
  });

  if (!stage) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const link = await prisma.familyLink.findFirst({
    where: {
      status: "APPROVED",
      OR: [
        { parentId: user.id, childId: stage.goal.childId },
        { childId: user.id, parentId: stage.goal.childId },
      ],
    },
  });

  if (user.id !== stage.goal.childId && !link) {
    return NextResponse.json({ error: "Нет прав на отправку доказательства" }, { status: 403 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const extension = extname(file.name) || ".bin";
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  const absolute = join(dir, filename);
  await writeFile(absolute, buffer);

  await prisma.goalStage.update({
    where: { id: stage.id },
    data: {
      status: "WAITING_APPROVAL",
      proofUrl: `/uploads/${filename}`,
      proofMimeType: file.type,
      submittedById: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
