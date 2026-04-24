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

export function AdminPanel({ users, questions }: { users: UserItem[]; questions: QuestionItem[] }) {
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
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Админ-панель</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Управление пользователями, банами, ролями администраторов и викториной.
        </p>
        {message ? <p className="mt-2 text-sm text-blue-700">{message}</p> : null}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Пользователи</h2>
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="rounded-md border border-zinc-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {u.firstName} {u.lastName} ({u.role})
                  </p>
                  <p className="text-zinc-500">{u.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateUser(u.id, { isBlocked: !u.isBlocked })}
                    className="rounded bg-red-600 px-2 py-1 text-white"
                  >
                    {u.isBlocked ? "Разблокировать" : "Заблокировать"}
                  </button>
                  <button
                    onClick={() => updateUser(u.id, { isAdmin: !u.isAdmin })}
                    className="rounded bg-indigo-600 px-2 py-1 text-white"
                  >
                    {u.isAdmin ? "Снять админа" : "Сделать админом"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Вопросы викторины (редактор)</h2>
        <form onSubmit={saveQuestion} className="grid gap-2 md:grid-cols-2">
          <input name="id" placeholder="ID (оставьте пустым для нового)" className="rounded-md border border-zinc-300 px-3 py-2" />
          <select name="category" required className="rounded-md border border-zinc-300 px-3 py-2">
            <option value="GENERAL_ERUDITION">General erudition</option>
            <option value="SCHOOL_PROGRAM">School program</option>
            <option value="FINANCIAL_LITERACY">Financial literacy</option>
            <option value="OTHER">Other</option>
          </select>
          <textarea name="text" required placeholder="Текст вопроса" className="md:col-span-2 rounded-md border border-zinc-300 px-3 py-2" />
          <input name="a" required placeholder="Вариант A" className="rounded-md border border-zinc-300 px-3 py-2" />
          <input name="b" required placeholder="Вариант Б" className="rounded-md border border-zinc-300 px-3 py-2" />
          <input name="c" required placeholder="Вариант В" className="rounded-md border border-zinc-300 px-3 py-2" />
          <input name="d" required placeholder="Вариант Г" className="rounded-md border border-zinc-300 px-3 py-2" />
          <input
            name="correctIndex"
            type="number"
            min={0}
            max={3}
            required
            placeholder="Индекс правильного ответа: 0..3"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          <button className="rounded-md bg-zinc-900 px-3 py-2 text-white">Сохранить вопрос</button>
        </form>
        <p className="mt-3 text-xs text-zinc-500">Всего активных/общих вопросов: {questions.length}</p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Принудительный запуск викторины</h2>
        <form onSubmit={launchQuiz} className="flex flex-wrap gap-2">
          <input
            type="number"
            name="questionCount"
            min={5}
            max={50}
            defaultValue={15}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-white">Запустить</button>
        </form>
      </section>
    </div>
  );
}
