import { QuestionCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type QuizPoolConfig = {
  [QuestionCategory.GENERAL_ERUDITION]: number;
  [QuestionCategory.SCHOOL_PROGRAM]: number;
  [QuestionCategory.FINANCIAL_LITERACY]: number;
  [QuestionCategory.OTHER]: number;
};

const defaultPool: QuizPoolConfig = {
  [QuestionCategory.GENERAL_ERUDITION]: 4,
  [QuestionCategory.SCHOOL_PROGRAM]: 4,
  [QuestionCategory.FINANCIAL_LITERACY]: 4,
  [QuestionCategory.OTHER]: 3,
};

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function getQuizQuestions(questionCount?: number) {
  const total = questionCount ?? 15;
  const ratio = total / 15;
  const perCategory: QuizPoolConfig = {
    [QuestionCategory.GENERAL_ERUDITION]: Math.max(
      1,
      Math.round(defaultPool[QuestionCategory.GENERAL_ERUDITION] * ratio),
    ),
    [QuestionCategory.SCHOOL_PROGRAM]: Math.max(
      1,
      Math.round(defaultPool[QuestionCategory.SCHOOL_PROGRAM] * ratio),
    ),
    [QuestionCategory.FINANCIAL_LITERACY]: Math.max(
      1,
      Math.round(defaultPool[QuestionCategory.FINANCIAL_LITERACY] * ratio),
    ),
    [QuestionCategory.OTHER]: Math.max(
      1,
      total -
        (Math.round(defaultPool[QuestionCategory.GENERAL_ERUDITION] * ratio) +
          Math.round(defaultPool[QuestionCategory.SCHOOL_PROGRAM] * ratio) +
          Math.round(defaultPool[QuestionCategory.FINANCIAL_LITERACY] * ratio)),
    ),
  };

  const chunks = await Promise.all(
    Object.entries(perCategory).map(async ([category, count]) => {
      const list = await prisma.question.findMany({
        where: { category: category as QuestionCategory, isActive: true },
      });
      return shuffle(list).slice(0, count);
    }),
  );

  return shuffle(chunks.flat()).slice(0, total);
}
