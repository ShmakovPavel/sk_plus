import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return NextResponse.json([]);

  const targetRole = user.role === UserRole.PARENT ? UserRole.CHILD : UserRole.PARENT;

  const list = await prisma.user.findMany({
    where: {
      role: targetRole,
      isBlocked: false,
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
    take: 20,
  });

  return NextResponse.json(list);
}
