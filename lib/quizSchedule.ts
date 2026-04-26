import { prisma } from "@/lib/prisma";
import { createQuizLaunch } from "@/lib/quizLaunch";

const MOSCOW_TZ = "Europe/Moscow";

function getMoscowParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const values = new Map(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(values.get("year") ?? "1970"),
    month: Number(values.get("month") ?? "1"),
    day: Number(values.get("day") ?? "1"),
    dateKey: `${values.get("year")}-${values.get("month")}-${values.get("day")}`,
    hour: Number(values.get("hour") ?? "0"),
    minute: Number(values.get("minute") ?? "0"),
  };
}

export function getMoscowDateKey(date: Date = new Date()) {
  return getMoscowParts(date).dateKey;
}

export function formatLaunchTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function moscowWallClockToUtc(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0, 0));
}

export function getNextLaunchDate(settings: { dailyLaunchHour: number; dailyLaunchMinute: number }, fromDate: Date = new Date()) {
  const nowMsk = getMoscowParts(fromDate);
  const launchTodayUtc = moscowWallClockToUtc(
    nowMsk.year,
    nowMsk.month,
    nowMsk.day,
    settings.dailyLaunchHour,
    settings.dailyLaunchMinute,
  );
  if (fromDate.getTime() < launchTodayUtc.getTime()) {
    return launchTodayUtc;
  }
  return new Date(launchTodayUtc.getTime() + 24 * 60 * 60 * 1000);
}

export async function getQuizSettings() {
  return prisma.quizSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function getTodayLaunch() {
  return prisma.quizLaunch.findFirst({
    where: { launchDateKey: getMoscowDateKey() },
    orderBy: { createdAt: "desc" },
  });
}

export async function ensureDailyQuizLaunch() {
  const settings = await getQuizSettings();
  const now = getMoscowParts();
  const shouldRunNow =
    now.hour > settings.dailyLaunchHour ||
    (now.hour === settings.dailyLaunchHour && now.minute >= settings.dailyLaunchMinute);

  if (!shouldRunNow) {
    return { settings, launch: null, launchedNow: false };
  }

  const dateKey = now.dateKey;
  const existing = await getTodayLaunch();
  if (existing) {
    return { settings, launch: existing, launchedNow: false };
  }

  const starter = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { id: true },
  });
  if (!starter) {
    return { settings, launch: null, launchedNow: false };
  }

  const { launch, created } = await createQuizLaunch({
    startedById: starter.id,
    questionCount: settings.questionCount,
    launchDateKey: dateKey,
  });
  return { settings, launch, launchedNow: created };
}
