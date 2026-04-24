import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  await requireAdmin();

  const [users, questions] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isAdmin: true,
        isBlocked: true,
      },
    }),
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return <AdminPanel users={users} questions={questions} />;
}
