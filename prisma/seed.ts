import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient, QuestionCategory, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

type RawQuestion = {
  id: string;
  text: string;
  options: string[];
  correct: number;
};

const extraQuestions: Array<{
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  category: QuestionCategory;
}> = [
  {
    text: "Какой материк самый большой по площади?",
    options: ["Африка", "Евразия", "Северная Америка", "Антарктида"],
    correctIndex: 1,
    category: QuestionCategory.GENERAL_ERUDITION,
  },
  {
    text: "Какая река самая длинная в России?",
    options: ["Волга", "Лена", "Обь", "Енисей"],
    correctIndex: 1,
    category: QuestionCategory.GENERAL_ERUDITION,
  },
  {
    text: "Сколько планет в Солнечной системе по современным данным?",
    options: ["7", "8", "9", "10"],
    correctIndex: 1,
    category: QuestionCategory.GENERAL_ERUDITION,
  },
  {
    text: "Какой язык считается самым распространенным по числу носителей?",
    options: ["Русский", "Английский", "Китайский", "Испанский"],
    correctIndex: 2,
    category: QuestionCategory.GENERAL_ERUDITION,
  },
  {
    text: "Чему равна сумма внутренних углов треугольника?",
    options: ["90°", "180°", "270°", "360°"],
    correctIndex: 1,
    category: QuestionCategory.SCHOOL_PROGRAM,
  },
  {
    text: "Как называется процесс испарения воды листьями растений?",
    options: ["Фотосинтез", "Транспирация", "Диффузия", "Конденсация"],
    correctIndex: 1,
    category: QuestionCategory.SCHOOL_PROGRAM,
  },
  {
    text: "Кто открыл закон всемирного тяготения?",
    options: ["Эйнштейн", "Ньютон", "Галилей", "Ломоносов"],
    correctIndex: 1,
    category: QuestionCategory.SCHOOL_PROGRAM,
  },
  {
    text: "Какая часть речи отвечает на вопрос «что делать?»?",
    options: ["Существительное", "Глагол", "Прилагательное", "Наречие"],
    correctIndex: 1,
    category: QuestionCategory.SCHOOL_PROGRAM,
  },
  {
    text: "Что выгоднее при длительных накоплениях?",
    options: ["Хранить все наличными", "Инвестировать с учетом риска", "Покупать только валюту", "Не планировать"],
    correctIndex: 1,
    category: QuestionCategory.FINANCIAL_LITERACY,
  },
  {
    text: "Для чего нужен PIN-код банковской карты?",
    options: ["Для красоты", "Для подтверждения операций", "Для расчета кэшбэка", "Для перевода процентов"],
    correctIndex: 1,
    category: QuestionCategory.FINANCIAL_LITERACY,
  },
  {
    text: "Что такое сложный процент?",
    options: ["Процент на изначальную сумму", "Процент на сумму с уже начисленными процентами", "Разовый налог", "Комиссия банка"],
    correctIndex: 1,
    category: QuestionCategory.FINANCIAL_LITERACY,
  },
  {
    text: "Что нужно сделать при подозрительном звонке «из банка»?",
    options: ["Сообщить код из SMS", "Назвать CVV", "Положить трубку и перезвонить в банк по официальному номеру", "Перевести деньги на «безопасный счет»"],
    correctIndex: 2,
    category: QuestionCategory.FINANCIAL_LITERACY,
  },
  {
    text: "Какой фильм о мальчике-волшебнике начинается в школе Хогвартс?",
    options: ["Хроники Нарнии", "Гарри Поттер", "Аватар", "Матрица"],
    correctIndex: 1,
    category: QuestionCategory.OTHER,
  },
  {
    text: "Какой жанр аниме обычно означает «повседневность»?",
    options: ["Сёдзё", "Сэйнэн", "Слайс оф лайф", "Меха"],
    correctIndex: 2,
    category: QuestionCategory.OTHER,
  },
  {
    text: "Как называется музыкальный ритм в размере 4/4 с четким битом, популярный в поп-музыке?",
    options: ["Вальс", "Марш", "Бэкбит", "Реквием"],
    correctIndex: 2,
    category: QuestionCategory.OTHER,
  },
];

function guessCategory(text: string): QuestionCategory {
  const lower = text.toLowerCase();
  if (
    lower.includes("кредит") ||
    lower.includes("инфляц") ||
    lower.includes("бюджет") ||
    lower.includes("вклад") ||
    lower.includes("облигац")
  ) {
    return QuestionCategory.FINANCIAL_LITERACY;
  }
  if (
    lower.includes("формула") ||
    lower.includes("сколько будет") ||
    lower.includes("планета") ||
    lower.includes("давление")
  ) {
    return QuestionCategory.SCHOOL_PROGRAM;
  }
  return QuestionCategory.GENERAL_ERUDITION;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateInPast(daysBack: number) {
  const now = Date.now();
  const delta = randInt(1, daysBack) * 24 * 60 * 60 * 1000;
  return new Date(now - delta);
}

function randomDateBetweenDays(minDaysAgo: number, maxDaysAgo: number) {
  const now = Date.now();
  const daysAgo = randInt(minDaysAgo, maxDaysAgo);
  return new Date(now - daysAgo * 24 * 60 * 60 * 1000);
}

async function main() {
  await prisma.quizSettings.deleteMany();
  await prisma.quizLaunchAnswer.deleteMany();
  await prisma.quizLaunchQuestion.deleteMany();
  await prisma.quizLaunch.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.goalStage.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.familyLink.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const raw = await readFile(resolve(process.cwd(), "_fl", "questions.json"), "utf8");
  const parsed = JSON.parse(raw) as RawQuestion[];

  const imported = parsed
    .filter((q) => q.options.length === 4 && q.correct >= 0 && q.correct <= 3)
    .map((q) => ({
      text: q.text.slice(0, 220),
      optionA: q.options[0].slice(0, 120),
      optionB: q.options[1].slice(0, 120),
      optionC: q.options[2].slice(0, 120),
      optionD: q.options[3].slice(0, 120),
      correctIndex: q.correct,
      category: guessCategory(q.text),
      isActive: true,
    }));

  await prisma.question.createMany({
    data: [
      ...imported,
      ...extraQuestions.map((q) => ({
        text: q.text,
        optionA: q.options[0],
        optionB: q.options[1],
        optionC: q.options[2],
        optionD: q.options[3],
        correctIndex: q.correctIndex,
        category: q.category,
        isActive: true,
      })),
    ],
  });

  await prisma.quizSettings.create({
    data: {
      id: 1,
      dailyLaunchHour: 19,
      dailyLaunchMinute: 0,
      questionCount: 15,
    },
  });

  const passwordHash = await bcrypt.hash("12345678", 10);

  const parent = await prisma.user.create({
    data: {
      email: "parent@sk.plus",
      passwordHash,
      firstName: "Марина",
      lastName: "Иванова",
      role: UserRole.PARENT,
      balance: 100000,
    },
  });

  const child = await prisma.user.create({
    data: {
      email: "child@sk.plus",
      passwordHash,
      firstName: "Андрей",
      lastName: "Иванов",
      role: UserRole.CHILD,
      balance: 0,
    },
  });

  const lisa = await prisma.user.create({
    data: {
      email: "liza@sk.plus",
      passwordHash,
      firstName: "Лиза",
      lastName: "Иванова",
      role: UserRole.CHILD,
      balance: 5000,
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@sk.plus",
      passwordHash,
      firstName: "Система",
      lastName: "Админ",
      role: UserRole.PARENT,
      isAdmin: true,
      balance: 100000,
    },
  });

  await prisma.familyLink.create({
    data: {
      parentId: parent.id,
      childId: child.id,
      status: "APPROVED",
    },
  });

  await prisma.familyLink.create({
    data: {
      parentId: parent.id,
      childId: lisa.id,
      status: "APPROVED",
    },
  });

  const goal = await prisma.goal.create({
    data: {
      title: "Накопить на новый велосипед",
      description: "Мечта: купить городской велосипед к лету.",
      totalAmount: 24000,
      createdById: child.id,
      childId: child.id,
      stages: {
        create: [
          { title: "Изучить 5 моделей и сделать сравнительную таблицу", amount: 5000, orderIndex: 1 },
          { title: "Откладывать карманные деньги 4 недели подряд", amount: 7000, orderIndex: 2 },
          { title: "Снять видео-презентацию выбора и финального бюджета", amount: 12000, orderIndex: 3 },
        ],
      },
    },
  });

  await prisma.goal.create({
    data: {
      title: "Накопить на поездку в научный лагерь",
      description: "Нужно закрыть этапы подготовки и дисциплины.",
      totalAmount: 18000,
      createdById: parent.id,
      childId: child.id,
      stages: {
        create: [
          { title: "Закрыть все домашние задания без пропусков за 2 недели", amount: 6000, orderIndex: 1 },
          { title: "Подготовить проект по финансовой грамотности", amount: 6000, orderIndex: 2 },
          { title: "Собрать список вещей и защитить план поездки", amount: 6000, orderIndex: 3 },
        ],
      },
    },
  });

  await prisma.goal.create({
    data: {
      title: "Накопить на набор для рисования",
      description: "Мечта осуществилась!",
      totalAmount: 9000,
      createdById: parent.id,
      childId: lisa.id,
      status: "COMPLETED",
      stages: {
        create: [
          { title: "Выбрать набор и сравнить цены", amount: 3000, orderIndex: 1, status: "DONE" },
          { title: "Сделать план покупок", amount: 3000, orderIndex: 2, status: "DONE" },
          { title: "Показать итоговый выбор", amount: 3000, orderIndex: 3, status: "DONE" },
        ],
      },
    },
  });

  await prisma.goal.create({
    data: {
      title: "Накопить на ролики",
      description: "Цель в процессе: один этап уже закрыт.",
      totalAmount: 15000,
      createdById: parent.id,
      childId: lisa.id,
      stages: {
        create: [
          { title: "Выбрать модель и размер", amount: 5000, orderIndex: 1, status: "DONE" },
          { title: "Записать видео с тренировкой", amount: 5000, orderIndex: 2, status: "WAITING_APPROVAL" },
          { title: "Сделать план безопасного катания", amount: 5000, orderIndex: 3, status: "PENDING" },
        ],
      },
    },
  });

  const parentFirstNames = [
    "Ольга",
    "Наталья",
    "Елена",
    "Татьяна",
    "Ирина",
    "Анна",
    "Светлана",
    "Юлия",
    "Дарья",
    "Ксения",
  ];
  const parentLastNames = [
    "Соколова",
    "Кузнецова",
    "Попова",
    "Смирнова",
    "Волкова",
    "Лебедева",
    "Павлова",
    "Козлова",
    "Новикова",
    "Морозова",
  ];
  const childFirstNames = [
    "Миша",
    "Соня",
    "Дима",
    "Алина",
    "Кирилл",
    "Вика",
    "Лёша",
    "Полина",
    "Матвей",
    "Арина",
    "Петя",
    "Ника",
  ];
  const generatedQuizUserIds: string[] = [];

  for (let i = 1; i <= 20; i += 1) {
    const parentFirstName = parentFirstNames[(i - 1) % parentFirstNames.length];
    const parentLastName = parentLastNames[(i * 3) % parentLastNames.length];
    const generatedParent = await prisma.user.create({
      data: {
        email: `parent${i}@sk.plus`,
        passwordHash,
        firstName: parentFirstName,
        lastName: parentLastName,
        role: UserRole.PARENT,
        balance: randInt(2000, 150000),
      },
    });

    const childrenCount = randInt(1, 3);
    const generatedChildren: Array<{ id: string }> = [];

    for (let childIndex = 1; childIndex <= childrenCount; childIndex += 1) {
      const childFirstName = childFirstNames[(i + childIndex) % childFirstNames.length];
      const childLastName = parentLastName;
      const generatedChild = await prisma.user.create({
        data: {
          email: `child${i}_${childIndex}@sk.plus`,
          passwordHash,
          firstName: childFirstName,
          lastName: childLastName,
          role: UserRole.CHILD,
          balance: randInt(0, 12000),
        },
      });
      generatedChildren.push({ id: generatedChild.id });

      await prisma.familyLink.create({
        data: {
          parentId: generatedParent.id,
          childId: generatedChild.id,
          status: "APPROVED",
        },
      });
    }

    const quizUsers = [generatedParent.id, ...generatedChildren.map((c) => c.id)];
    generatedQuizUserIds.push(...quizUsers);
    for (const userId of quizUsers) {
      const attemptsCount = randInt(2, 18);
      for (let a = 0; a < attemptsCount; a += 1) {
        const totalQuestions = randInt(8, 20);
        const correctAnswers = randInt(0, totalQuestions);
        const avgPoints = correctAnswers > 0 ? randInt(70, 160) : 0;
        await prisma.quizAttempt.create({
          data: {
            userId,
            launchId: null,
            totalQuestions,
            correctAnswers,
            score: correctAnswers * avgPoints,
            createdAt: randomDateInPast(360),
          },
        });
      }
    }
  }

  const uniqueQuizUserIds = [...new Set(generatedQuizUserIds)];
  const dailyLeaders = uniqueQuizUserIds.slice(0, 10);
  const monthlyLeaders = uniqueQuizUserIds.slice(10, 20);
  const yearlyLeaders = uniqueQuizUserIds.slice(20, 30);

  for (const userId of dailyLeaders) {
    for (let i = 0; i < 3; i += 1) {
      const correctAnswers = randInt(9, 15);
      await prisma.quizAttempt.create({
        data: {
          userId,
          launchId: null,
          totalQuestions: 15,
          correctAnswers,
          score: correctAnswers * randInt(150, 220),
          createdAt: randomDateBetweenDays(0, 1),
        },
      });
    }
  }

  for (const userId of monthlyLeaders) {
    for (let i = 0; i < 4; i += 1) {
      const correctAnswers = randInt(8, 15);
      await prisma.quizAttempt.create({
        data: {
          userId,
          launchId: null,
          totalQuestions: 15,
          correctAnswers,
          score: correctAnswers * randInt(140, 210),
          createdAt: randomDateBetweenDays(8, 26),
        },
      });
    }
  }

  for (const userId of yearlyLeaders) {
    for (let i = 0; i < 6; i += 1) {
      const correctAnswers = randInt(10, 18);
      await prisma.quizAttempt.create({
        data: {
          userId,
          launchId: null,
          totalQuestions: 20,
          correctAnswers,
          score: correctAnswers * randInt(160, 260),
          createdAt: randomDateBetweenDays(90, 340),
        },
      });
    }
  }

  console.log(`Seed completed. Base goal id: ${goal.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
