import { prisma } from "@/lib/prisma";

export const QUIZ_QUESTION_DURATION_SECONDS = 15;
const QUESTION_DURATION_MS = QUIZ_QUESTION_DURATION_SECONDS * 1000;
const ANSWER_LETTERS = ["А", "Б", "В", "Г"] as const;
function getQuestionOptions(question: {
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}) {
  return [question.optionA, question.optionB, question.optionC, question.optionD];
}


export function getUserTag(firstName: string, userId: string) {
  const tail = userId.replace(/[^0-9]/g, "").slice(-5).padStart(5, "0");
  return `${firstName}#${tail}`;
}

type RuntimeResult =
  | { status: "not_found" }
  | {
      status: "finished";
      launchId: string;
      totalQuestions: number;
      score: number;
      correctAnswers: number;
    }
  | {
      status: "active";
      launchId: string;
      totalQuestions: number;
      currentQuestionIndex: number;
      remainingSeconds: number;
      hasAnsweredCurrentCorrectly: boolean;
      score: number;
      correctAnswers: number;
      question: {
        id: string;
        text: string;
        category: string;
        options: string[];
        correctIndex: number;
      };
      firstCorrectLog: string | null;
    };

export async function getQuizRuntimeForUser(launchId: string, userId: string): Promise<RuntimeResult> {
  const launch = await prisma.quizLaunch.findFirst({
    where: { id: launchId, startedBy: { isAdmin: true } },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { question: true },
      },
    },
  });

  if (!launch) return { status: "not_found" };

  const totalQuestions = launch.questions.length;
  const totalByUser = await prisma.quizLaunchAnswer.aggregate({
    where: { launchId, userId },
    _sum: { points: true },
    _count: { _all: true },
  });
  const score = totalByUser._sum.points ?? 0;
  const correctAnswers = totalByUser._count._all;

  if (totalQuestions === 0) {
    return {
      status: "finished",
      launchId,
      totalQuestions,
      score,
      correctAnswers,
    };
  }

  const elapsedMs = Math.max(0, Date.now() - launch.createdAt.getTime());
  const questionIndex = Math.floor(elapsedMs / QUESTION_DURATION_MS);
  if (questionIndex >= totalQuestions) {
    return {
      status: "finished",
      launchId,
      totalQuestions,
      score,
      correctAnswers,
    };
  }

  const current = launch.questions[questionIndex];
  const phaseElapsedMs = elapsedMs % QUESTION_DURATION_MS;
  const remainingSeconds = Math.max(1, Math.ceil((QUESTION_DURATION_MS - phaseElapsedMs) / 1000));

  const [userAnswer, firstCorrect] = await Promise.all([
    prisma.quizLaunchAnswer.findUnique({
      where: {
        launchId_questionId_userId: {
          launchId,
          questionId: current.questionId,
          userId,
        },
      },
      select: { id: true },
    }),
    prisma.quizLaunchAnswer.findFirst({
      where: {
        launchId,
        questionId: current.questionId,
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, firstName: true },
        },
      },
    }),
  ]);

  const options = getQuestionOptions(current.question);
  const firstCorrectLog =
    firstCorrect && current.question.correctIndex >= 0 && current.question.correctIndex < options.length
      ? `Первый правильный ответ: ${getUserTag(firstCorrect.user.firstName, firstCorrect.user.id)}. ${ANSWER_LETTERS[current.question.correctIndex]} - ${options[current.question.correctIndex]}`
      : null;

  return {
    status: "active",
    launchId,
    totalQuestions,
    currentQuestionIndex: questionIndex,
    remainingSeconds,
    hasAnsweredCurrentCorrectly: Boolean(userAnswer),
    score,
    correctAnswers,
    question: {
      id: current.question.id,
      text: current.question.text,
      category: current.question.category,
      options,
      correctIndex: current.question.correctIndex,
    },
    firstCorrectLog,
  };
}
