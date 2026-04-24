import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const body = await req.json();
  const linkId = body.linkId as string | undefined;
  const accept = Boolean(body.accept);

  if (!linkId) return NextResponse.json({ error: "linkId обязателен" }, { status: 400 });

  const link = await prisma.familyLink.findUnique({ where: { id: linkId } });
  if (!link) return NextResponse.json({ error: "Связь не найдена" }, { status: 404 });

  const canRespond =
    (user.role === UserRole.PARENT && link.parentId === user.id) ||
    (user.role === UserRole.CHILD && link.childId === user.id);

  if (!canRespond) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.familyLink.update({
    where: { id: link.id },
    data: { status: accept ? "APPROVED" : "REJECTED" },
  });

  return NextResponse.json({ ok: true });
}
