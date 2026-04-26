import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getQuizQuestions } from "@/lib/quiz";

const launchQuestionsInclude = {
  questions: {
    orderBy: { orderIndex: "asc" as const },
    include: { question: true },
  },
};

export async function createQuizLaunch(params: {
  startedById: string;
  questionCount: number;
  launchDateKey?: string;
}) {
  const { startedById, questionCount, launchDateKey } = params;

  if (launchDateKey) {
    await prisma.quizLaunch.deleteMany({
      where: {
        launchDateKey,
        startedBy: { isAdmin: false },
      },
    });

    const existing = await prisma.quizLaunch.findFirst({
      where: {
        launchDateKey,
        startedBy: { isAdmin: true },
      },
      include: launchQuestionsInclude,
    });
    if (existing) return { launch: existing, created: false };
  }

  const selectedQuestions = await getQuizQuestions(questionCount);

  try {
    const launch = await prisma.quizLaunch.create({
      data: {
        startedById,
        questionCount,
        launchDateKey: launchDateKey ?? null,
        questions: {
          create: selectedQuestions.map((q, idx) => ({
            questionId: q.id,
            orderIndex: idx + 1,
          })),
        },
      },
      include: launchQuestionsInclude,
    });
    return { launch, created: true };
  } catch (error) {
    if (launchDateKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.quizLaunch.findFirst({
        where: {
          launchDateKey,
          startedBy: { isAdmin: true },
        },
        include: launchQuestionsInclude,
      });
      if (existing) return { launch: existing, created: false };
    }
    throw error;
  }
}

export async function getLaunchWithQuestionsByDateKey(launchDateKey: string) {
  const launch = await prisma.quizLaunch.findFirst({
    where: {
      launchDateKey,
      startedBy: { isAdmin: true },
    },
    include: launchQuestionsInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!launch) return null;
  if (launch.questions.length > 0) return launch;

  const selectedQuestions = await getQuizQuestions(launch.questionCount);
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.quizLaunchQuestion.findFirst({
        where: { launchId: launch.id },
        select: { id: true },
      });
      if (existing) return;

      for (const [idx, q] of selectedQuestions.entries()) {
        await tx.quizLaunchQuestion.create({
          data: {
            launchId: launch.id,
            questionId: q.id,
            orderIndex: idx + 1,
          },
        });
      }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  return prisma.quizLaunch.findUnique({
    where: { id: launch.id },
    include: launchQuestionsInclude,
  });
}

export async function stopQuizLaunchByDateKey(launchDateKey: string) {
  const result = await prisma.quizLaunch.deleteMany({
    where: {
      launchDateKey,
      startedBy: { isAdmin: true },
    },
  });
  return result.count;
}
