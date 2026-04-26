"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type UserItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isBlocked: boolean;
};

type QuestionItem = {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
  category: string;
  isActive: boolean;
};

type QuizSettings = {
  dailyLaunchHour: number;
  dailyLaunchMinute: number;
  questionCount: number;
};

export function AdminPanel({
  users,
  questions,
  quizSettings,
  isQuizLaunchedToday,
}: {
  users: UserItem[];
  questions: QuestionItem[];
  quizSettings: QuizSettings;
  isQuizLaunchedToday: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function updateUser(userId: string, payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...payload }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Пользователь обновлен" : data.error);
    router.refresh();
  }

  async function saveQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      id: form.get("id") || undefined,
      text: form.get("text"),
      options: [form.get("a"), form.get("b"), form.get("c"), form.get("d")],
      correctIndex: Number(form.get("correctIndex")),
      category: form.get("category"),
      isActive: true,
    };
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMessage(res.ok ? "Вопрос сохранен" : data.error);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  async function launchQuiz(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/launch-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionCount: Number(form.get("questionCount")) }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Новый раунд викторины запущен" : data.error);
    if (res.ok) router.refresh();
  }

  async function stopQuiz() {
    const res = await fetch("/api/admin/stop-quiz", {
      method: "POST",
    });
    const data = await res.json();
    setMessage(res.ok ? "Текущий раунд викторины остановлен" : data.error);
    if (res.ok) router.refresh();
  }

  async function saveQuizSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const [hour, minute] = String(form.get("launchTime") ?? "19:00")
      .split(":")
      .map((v) => Number(v));
    const questionCount = Number(form.get("questionCount"));
    const res = await fetch("/api/admin/quiz-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyLaunchHour: hour,
        dailyLaunchMinute: minute,
        questionCount,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Настройки викторины сохранены" : data.error);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Админ-панель</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Управление пользователями, банами, ролями администраторов и викториной.
        </p>
        {message ? <p className="mt-2 text-sm text-[var(--accent-strong)]">{message}</p> : null}
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <details>
          <summary className="cursor-pointer font-semibold">Пользователи ({users.length})</summary>
          <ul className="mt-3 space-y-2">
            {users.map((u) => (
              <li key={u.id} className="rounded-md border border-[var(--surface-border)]/80 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {u.firstName} {u.lastName} ({u.role})
                    </p>
                    <p className="text-[var(--muted)]">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateUser(u.id, { isBlocked: !u.isBlocked })}
                      className="rounded bg-red-600 px-2 py-1 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                    >
                      {u.isBlocked ? "Разблокировать" : "Заблокировать"}
                    </button>
                    <button
                      onClick={() => updateUser(u.id, { isAdmin: !u.isAdmin })}
                      className="rounded bg-[var(--accent-strong)] px-2 py-1 text-white transition-colors hover:bg-[var(--accent-strong-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      {u.isAdmin ? "Снять админа" : "Сделать админом"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Вопросы викторины (редактор)</h2>
        <form onSubmit={saveQuestion} className="grid gap-2 md:grid-cols-2">
          <input
            name="id"
            placeholder="ID (оставьте пустым для нового)"
            className="rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <select
            name="category"
            required
            className="rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <option value="GENERAL_ERUDITION" className="bg-[var(--surface)] text-[var(--foreground)]">
              General erudition
            </option>
            <option value="SCHOOL_PROGRAM" className="bg-[var(--surface)] text-[var(--foreground)]">
              School program
            </option>
            <option value="FINANCIAL_LITERACY" className="bg-[var(--surface)] text-[var(--foreground)]">
              Financial literacy
            </option>
            <option value="OTHER" className="bg-[var(--surface)] text-[var(--foreground)]">
              Other
            </option>
          </select>
          <textarea
            name="text"
            required
            placeholder="Текст вопроса"
            className="md:col-span-2 rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <input
            name="a"
            required
            placeholder="Вариант A"
            className="rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <input
            name="b"
            required
            placeholder="Вариант Б"
            className="rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <input
            name="c"
            required
            placeholder="Вариант В"
            className="rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <input
            name="d"
            required
            placeholder="Вариант Г"
            className="rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <input
            name="correctIndex"
            type="number"
            min={0}
            max={3}
            required
            placeholder="Индекс правильного ответа: 0..3"
            className="rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <button className="rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            Сохранить вопрос
          </button>
        </form>
        <p className="mt-3 text-xs text-[var(--muted)]">Всего активных/общих вопросов: {questions.length}</p>
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Настройка запуска викторины</h2>
        <form onSubmit={saveQuizSettings} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Время запуска (МСК)
            <input
              type="time"
              name="launchTime"
              defaultValue={`${String(quizSettings.dailyLaunchHour).padStart(2, "0")}:${String(quizSettings.dailyLaunchMinute).padStart(2, "0")}`}
              className="mt-1 w-full rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            />
          </label>
          <label className="text-sm">
            Вопросов в раунде
            <input
              type="number"
              name="questionCount"
              min={5}
              max={50}
              defaultValue={quizSettings.questionCount}
              className="mt-1 w-full rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            />
          </label>
          <button className="rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            Сохранить расписание
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Принудительный запуск викторины</h2>
        <p className="mb-2 text-sm text-[var(--muted)]">
          Сегодняшний статус: {isQuizLaunchedToday ? "уже запущена" : "ещё не запускалась"}.
        </p>
        <form onSubmit={launchQuiz} className="flex flex-wrap gap-2">
          <input
            type="number"
            name="questionCount"
            min={5}
            max={50}
            defaultValue={quizSettings.questionCount}
            className="rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <button className="rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            Запустить
          </button>
          <button
            type="button"
            onClick={stopQuiz}
            disabled={!isQuizLaunchedToday}
            className="rounded-md bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Остановить
          </button>
        </form>
      </section>
    </div>
  );
}
