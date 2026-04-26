import { UserRole } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalsBoard } from "@/components/GoalsBoard";

export default async function GoalsPage() {
  const user = await requireUser();

  const approvedLinks = await prisma.familyLink.findMany({
    where:
      user.role === UserRole.PARENT
        ? { parentId: user.id, status: "APPROVED" }
        : { childId: user.id, status: "APPROVED" },
    include: { parent: true, child: true },
  });

  const availableChildren =
    user.role === UserRole.PARENT
      ? approvedLinks.map((l) => l.child)
      : [{ id: user.id, firstName: user.firstName, lastName: user.lastName }];

  const linkedUsers =
    user.role === UserRole.PARENT
      ? approvedLinks.map((l) => ({
          id: l.child.id,
          firstName: l.child.firstName,
          lastName: l.child.lastName,
        }))
      : approvedLinks.map((l) => ({
          id: l.parent.id,
          firstName: l.parent.firstName,
          lastName: l.parent.lastName,
        }));

  const pendingLinks = await prisma.familyLink.findMany({
    where:
      user.role === UserRole.PARENT
        ? { parentId: user.id, status: "PENDING" }
        : { childId: user.id, status: "PENDING" },
    include: { parent: true, child: true },
  });

  const goals = await prisma.goal.findMany({
    where: {
      childId: {
        in:
          user.role === UserRole.PARENT
            ? approvedLinks.map((l) => l.childId)
            : [user.id, ...approvedLinks.map((l) => l.childId)],
      },
    },
    include: {
      child: true,
      stages: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <GoalsBoard
      currentUser={{
        id: user.id,
        role: user.role,
      }}
      availableChildren={availableChildren}
      linkedUsers={linkedUsers}
      pendingLinks={pendingLinks.map((l) => ({
        id: l.id,
        parentName: `${l.parent.firstName} ${l.parent.lastName}`,
        childName: `${l.child.firstName} ${l.child.lastName}`,
      }))}
      goals={goals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        childName: `${g.child.firstName} ${g.child.lastName}`,
        status: g.status,
        totalAmount: g.totalAmount,
        stages: g.stages.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          orderIndex: s.orderIndex,
          amount: s.amount,
          proofUrl: s.proofUrl,
        })),
      }))}
    />
  );
}
