"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  currentUser: { id: string; role: "PARENT" | "CHILD" };
  availableChildren: { id: string; firstName: string; lastName: string }[];
  pendingLinks: { id: string; parentName: string; childName: string }[];
  goals: {
    id: string;
    title: string;
    description: string;
    childName: string;
    status: string;
    totalAmount: number;
    stages: {
      id: string;
      title: string;
      status: string;
      orderIndex: number;
      amount: number;
      proofUrl: string | null;
    }[];
  }[];
};

export function GoalsBoard({ currentUser, availableChildren, pendingLinks, goals }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; firstName: string; lastName: string; email: string }[]
  >([]);
  const [stageDrafts, setStageDrafts] = useState([{ title: "", amount: 0 }]);
  const [message, setMessage] = useState("");

  const goalExamples = useMemo(
    () => [
      "Накопить на велосипед: выбор модели -> план накоплений -> финальная презентация",
      "Накопить на поездку: дисциплина по учебе -> мини-проект -> защита бюджета",
      "Накопить на игровую консоль: сравнение цен -> накопление 6 недель -> отчёт о целях",
    ],
    [],
  );

  async function runSearch() {
    const res = await fetch(`/api/family/search?q=${encodeURIComponent(search)}`);
    setSearchResults(await res.json());
  }

  async function sendFamilyRequest(targetUserId: string) {
    const res = await fetch("/api/family/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Запрос отправлен" : data.error);
    router.refresh();
  }

  async function respondToLink(linkId: string, accept: boolean) {
    const res = await fetch("/api/family/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId, accept }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Ответ сохранён" : data.error);
    router.refresh();
  }

  async function createGoal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title"),
      description: form.get("description"),
      childId: form.get("childId"),
      stages: stageDrafts.filter((s) => s.title && s.amount > 0),
    };
    const res = await fetch("/api/goals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMessage(res.ok ? "Цель создана" : data.error);
    if (res.ok) {
      setStageDrafts([{ title: "", amount: 0 }]);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  async function uploadProof(stageId: string, proof: File) {
    const fd = new FormData();
    fd.append("stageId", stageId);
    fd.append("proof", proof);
    const res = await fetch("/api/goals/submit-proof", { method: "POST", body: fd });
    const data = await res.json();
    setMessage(res.ok ? "Доказательство отправлено" : data.error);
    router.refresh();
  }

  async function approveStage(stageId: string) {
    const res = await fetch("/api/goals/approve-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Этап подтверждён, перевод выполнен" : data.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Механика целей «Накопи на мечту»</h1>
        <p className="mt-2 text-sm text-zinc-600">
          После подтверждения этапа средства переводятся с баланса родителя в копилку ребенка.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600">
          {goalExamples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
        {message ? <p className="mt-3 text-sm font-medium text-blue-700">{message}</p> : null}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Поиск родителя / ребенка</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Введите имя, фамилию или email"
          />
          <button onClick={runSearch} className="rounded-md bg-zinc-900 px-3 py-2 text-white">
            Найти
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {searchResults.map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-2">
              <span>
                {u.firstName} {u.lastName} ({u.email})
              </span>
              <button onClick={() => sendFamilyRequest(u.id)} className="rounded bg-blue-600 px-2 py-1 text-white">
                Отправить запрос
              </button>
            </li>
          ))}
        </ul>
      </section>

      {pendingLinks.length ? (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Ожидают подтверждения</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pendingLinks.map((l) => (
              <li key={l.id} className="rounded-md border border-zinc-200 p-3">
                <p>
                  {l.parentName} ↔ {l.childName}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => respondToLink(l.id, true)}
                    className="rounded bg-emerald-600 px-2 py-1 text-white"
                  >
                    Подтвердить
                  </button>
                  <button
                    onClick={() => respondToLink(l.id, false)}
                    className="rounded bg-red-600 px-2 py-1 text-white"
                  >
                    Отклонить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Создать цель</h2>
        <form onSubmit={createGoal} className="mt-3 space-y-3">
          <input name="title" required placeholder="Название цели" className="w-full rounded-md border border-zinc-300 px-3 py-2" />
          <textarea
            name="description"
            required
            placeholder="Описание мечты и зачем она нужна"
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
          />
          <select name="childId" required className="w-full rounded-md border border-zinc-300 px-3 py-2">
            <option value="">Выберите ребёнка</option>
            {availableChildren.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>

          <div className="space-y-2 rounded-md border border-zinc-200 p-3">
            <p className="text-sm font-medium">Этапы</p>
            {stageDrafts.map((stage, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-2">
                <input
                  value={stage.title}
                  onChange={(e) => {
                    const next = [...stageDrafts];
                    next[index].title = e.target.value;
                    setStageDrafts(next);
                  }}
                  placeholder={`Этап ${index + 1}`}
                  className="rounded-md border border-zinc-300 px-3 py-2"
                />
                <input
                  type="number"
                  min={1}
                  value={stage.amount || ""}
                  onChange={(e) => {
                    const next = [...stageDrafts];
                    next[index].amount = Number(e.target.value);
                    setStageDrafts(next);
                  }}
                  placeholder="Сумма этапа"
                  className="rounded-md border border-zinc-300 px-3 py-2"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setStageDrafts([...stageDrafts, { title: "", amount: 0 }])}
              className="rounded-md bg-zinc-200 px-3 py-2 text-sm"
            >
              + Добавить этап
            </button>
          </div>

          <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-white">
            Создать цель
          </button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Все цели</h2>
        <div className="space-y-4">
          {goals.map((goal) => {
            const completed = goal.stages.filter((s) => s.status === "DONE").length;
            const progress = Math.round((completed / Math.max(goal.stages.length, 1)) * 100);
            return (
              <article key={goal.id} className="rounded-lg border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{goal.title}</h3>
                    <p className="text-sm text-zinc-600">{goal.description}</p>
                  </div>
                  <div className="text-sm text-zinc-500">
                    {goal.childName} | {goal.totalAmount.toLocaleString("ru-RU")} ₽
                  </div>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-200">
                  <div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">Прогресс: {progress}%</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {goal.stages.map((s) => (
                    <li key={s.id} className="rounded-md border border-zinc-200 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {s.orderIndex}. {s.title} ({s.amount.toLocaleString("ru-RU")} ₽) - {s.status}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="rounded bg-zinc-100 px-2 py-1 text-xs">
                            Загрузить фото/видео
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadProof(s.id, file);
                              }}
                            />
                          </label>
                          {(currentUser.role === "PARENT" || currentUser.role === "CHILD") &&
                          s.status === "WAITING_APPROVAL" ? (
                            <button
                              onClick={() => approveStage(s.id)}
                              className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                            >
                              Подтвердить этап
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {s.proofUrl ? (
                        <a href={s.proofUrl} target="_blank" className="mt-1 inline-block text-xs text-blue-600">
                          Открыть доказательство
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
