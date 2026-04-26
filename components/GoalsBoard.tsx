"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  currentUser: { id: string; role: "PARENT" | "CHILD" };
  availableChildren: { id: string; firstName: string; lastName: string }[];
  linkedUsers: { id: string; firstName: string; lastName: string }[];
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

type StageDraft = { title: string; amount: number };

export function GoalsBoard({ currentUser, availableChildren, linkedUsers, pendingLinks, goals }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; firstName: string; lastName: string; email: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [goalStep, setGoalStep] = useState<"goal" | "stages">("goal");
  const [goalDraft, setGoalDraft] = useState({
    title: "",
    description: "",
    childId: availableChildren[0]?.id ?? "",
  });
  const [stageDrafts, setStageDrafts] = useState<StageDraft[]>([{ title: "", amount: 0 }]);
  const [showSearch, setShowSearch] = useState(false);

  const linkedIds = useMemo(() => new Set(linkedUsers.map((user) => user.id)), [linkedUsers]);
  const groupedGoals = useMemo(() => {
    const map = new Map<string, Props["goals"]>();
    for (const goal of goals) {
      const list = map.get(goal.childName) ?? [];
      list.push(goal);
      map.set(goal.childName, list);
    }
    return Array.from(map.entries());
  }, [goals]);
  const firstOpenGoalId = useMemo(() => {
    const firstNotDone = goals.find((goal) => goal.stages.some((stage) => stage.status !== "DONE"));
    return firstNotDone?.id ?? goals[0]?.id ?? "";
  }, [goals]);

  useEffect(() => {
    if (!goalDraft.childId && availableChildren.length) {
      setGoalDraft((prev) => ({ ...prev, childId: availableChildren[0].id }));
    }
  }, [availableChildren, goalDraft.childId]);

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

  async function submitGoal() {
    const stages = stageDrafts
      .map((stage) => ({ title: stage.title.trim(), amount: Number(stage.amount) }))
      .filter((stage) => stage.title && stage.amount > 0);

    if (!goalDraft.title.trim() || !goalDraft.description.trim()) {
      setMessage("Заполните название и описание цели");
      setGoalStep("goal");
      return;
    }
    if (!goalDraft.childId) {
      setMessage("Выберите ребёнка");
      setGoalStep("goal");
      return;
    }
    if (!stages.length) {
      setMessage("Добавьте хотя бы один этап с суммой");
      return;
    }

    const res = await fetch("/api/goals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: goalDraft.title.trim(),
        description: goalDraft.description.trim(),
        childId: goalDraft.childId,
        stages,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Цель создана" : data.error);
    if (res.ok) {
      setGoalStep("goal");
      setGoalDraft({
        title: "",
        description: "",
        childId: availableChildren[0]?.id ?? "",
      });
      setStageDrafts([{ title: "", amount: 0 }]);
      router.refresh();
    }
  }

  function updateStage(index: number, patch: Partial<StageDraft>) {
    setStageDrafts((prev) => prev.map((stage, i) => (i === index ? { ...stage, ...patch } : stage)));
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
      {message ? (
        <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--soft)] p-3 text-sm font-medium text-[var(--accent-strong)]">
          {message}
        </section>
      ) : null}

      {pendingLinks.length ? (
        <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="font-semibold">Ожидают подтверждения</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pendingLinks.map((l) => (
              <li key={l.id} className="rounded-md border border-[var(--surface-border)]/80 p-3">
                <p>
                  {l.parentName} ↔ {l.childName}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => respondToLink(l.id, true)}
                    className="rounded bg-[var(--accent)] px-2 py-1 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  >
                    Подтвердить
                  </button>
                  <button onClick={() => respondToLink(l.id, false)} className="rounded bg-red-600 px-2 py-1 text-white">
                    Отклонить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Все цели</h2>
        <div className="space-y-4">
          {groupedGoals.map(([childName, childGoals]) => (
            <section key={childName} className="rounded-lg border border-[var(--surface-border)]/80 p-3">
              {currentUser.role === "PARENT" ? <h3 className="mb-3 text-sm font-semibold text-[var(--soft-text)]">{childName}</h3> : null}
              <div className="space-y-3">
                {childGoals.map((goal) => {
                  const completed = goal.stages.filter((s) => s.status === "DONE").length;
                  const progress = Math.round((completed / Math.max(goal.stages.length, 1)) * 100);
                  const isDoneGoal = goal.stages.length > 0 && goal.stages.every((stage) => stage.status === "DONE");
                  const activeStages = goal.stages.filter((stage) => stage.status !== "DONE");
                  const doneStages = goal.stages.filter((stage) => stage.status === "DONE");
                  const shouldOpen = goal.id === firstOpenGoalId;

                  return (
                    <details
                      key={goal.id}
                      className={`rounded-lg border p-4 ${
                        isDoneGoal
                          ? "border-[var(--surface-border)]/35 bg-[var(--soft)]/70 opacity-75"
                          : "border-[var(--surface-border)]/80 bg-[var(--surface)]"
                      }`}
                      open={shouldOpen}
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4
                              className={`flex items-center gap-2 ${
                                isDoneGoal ? "font-normal text-[var(--muted)]/80" : "font-medium text-[var(--foreground)]"
                              }`}
                            >
                              <span aria-hidden="true">{isDoneGoal ? "✓" : "⏳"}</span>
                              {goal.title}
                            </h4>
                            {isDoneGoal ? <p className="text-sm text-[var(--muted)]/80">{goal.description}</p> : null}
                          </div>
                          <div className={`text-sm ${isDoneGoal ? "text-[var(--muted)]/80" : "text-[var(--muted)]"}`}>
                            {goal.totalAmount.toLocaleString("ru-RU")} ₽
                          </div>
                        </div>
                        {!isDoneGoal ? (
                          <>
                            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--soft)]">
                              <div
                                className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)]"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted)]">
                              <span>Прогресс: {progress}%</span>
                              <span className="inline-flex items-center gap-1">
                                Развернуть <span aria-hidden="true">▾</span>
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="mt-1 flex items-center justify-end text-xs text-[var(--muted)]">
                            <span className="inline-flex items-center gap-1">
                              Развернуть <span aria-hidden="true">▾</span>
                            </span>
                          </div>
                        )}
                      </summary>
                      <ul className="mt-3 space-y-2 text-sm">
                        {activeStages.map((s) => (
                          <li key={s.id} className="rounded-md border border-[var(--surface-border)]/80 p-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="flex items-center gap-2 text-[var(--muted)]">
                                {s.status === "WAITING_APPROVAL" ? <span aria-hidden="true">⏳</span> : null}
                                <span>
                                  {s.orderIndex}. {s.title} ({s.amount.toLocaleString("ru-RU")} ₽)
                                </span>
                              </span>
                              <div className="flex items-center gap-2">
                                {currentUser.role === "CHILD" ? (
                                  <label className="rounded bg-[var(--soft)] px-2 py-1 text-xs text-[var(--soft-text)]">
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
                                ) : null}
                                {currentUser.role === "PARENT" && s.status === "WAITING_APPROVAL" ? (
                                  <button
                                    onClick={() => approveStage(s.id)}
                                    className="rounded bg-[var(--accent)] px-2 py-1 text-xs text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                  >
                                    Подтвердить этап
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {s.proofUrl ? (
                              <a href={s.proofUrl} target="_blank" className="mt-1 inline-block text-xs text-[var(--accent-strong)]">
                                Открыть доказательство
                              </a>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {doneStages.length ? (
                        <details className="mt-2 rounded-md border border-[var(--surface-border)]/45 bg-[var(--soft)]/40 px-3 py-2">
                          <summary className="cursor-pointer text-sm text-[var(--muted)]">Выполненные этапы ({doneStages.length})</summary>
                          <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]/85">
                            {doneStages.map((s) => (
                              <li key={s.id} className="flex items-center gap-2">
                                <span aria-hidden="true">✓</span>
                                <span>
                                  {s.orderIndex}. {s.title} ({s.amount.toLocaleString("ru-RU")} ₽)
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </details>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="font-semibold">Создать цель</h2>
        {availableChildren.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Сначала свяжитесь с ребёнком, чтобы создать цель.</p>
        ) : goalStep === "goal" ? (
          <div className="mt-3 space-y-3">
            <input
              value={goalDraft.title}
              onChange={(e) => setGoalDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Название цели"
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            />
            <textarea
              value={goalDraft.description}
              onChange={(e) => setGoalDraft((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Коротко: зачем нужна цель и что получим"
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            />
            <select
              value={goalDraft.childId}
              onChange={(e) => setGoalDraft((prev) => ({ ...prev, childId: e.target.value }))}
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {availableChildren.map((c) => (
                <option key={c.id} value={c.id} className="bg-[var(--surface)] text-[var(--foreground)]">
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setGoalStep("stages")}
              className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Дальше: добавить этапы
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-md border border-[var(--surface-border)]/80 bg-[var(--soft)] p-3 text-sm">
              <p className="font-medium">{goalDraft.title || "Без названия"}</p>
              <p className="mt-1 text-[var(--muted)]">{goalDraft.description || "Без описания"}</p>
            </div>
            <div className="space-y-2 rounded-md border border-[var(--surface-border)]/80 p-3">
              <p className="text-sm font-medium">Этапы</p>
              {stageDrafts.map((stage, index) => (
                <div key={index} className="grid gap-2">
                  <input
                    value={stage.title}
                    onChange={(e) => updateStage(index, { title: e.target.value })}
                    placeholder={`Этап ${index + 1}: что нужно сделать`}
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={stage.amount || ""}
                      onChange={(e) => updateStage(index, { amount: Number(e.target.value) })}
                      placeholder="Сумма этапа"
                      className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    />
                    {stageDrafts.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setStageDrafts((prev) => prev.filter((_, i) => i !== index))}
                        className="rounded-md bg-red-600 px-3 py-2 text-white"
                      >
                        Убрать
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setStageDrafts((prev) => [...prev, { title: "", amount: 0 }])}
                className="rounded-md bg-[var(--soft)] px-3 py-2 text-sm text-[var(--soft-text)] transition-colors hover:bg-[var(--soft-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                + Добавить этап
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGoalStep("goal")}
                className="flex-1 rounded-md border border-[var(--input-border)] px-3 py-2 text-[var(--foreground)]"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={submitGoal}
                className="flex-1 rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Создать цель
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{currentUser.role === "PARENT" ? "Дети" : "Родители"}</h2>
          <button
            type="button"
            onClick={() => setShowSearch((prev) => !prev)}
            className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--accent)] text-lg leading-none text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label={showSearch ? "Скрыть поиск" : "Показать поиск"}
          >
            +
          </button>
        </div>
        <div className="mt-2 rounded-md border border-[var(--surface-border)]/80 bg-[var(--soft)] p-3">
          <ul className="space-y-1 text-sm">
            {linkedUsers.length ? (
              linkedUsers.map((u) => (
                <li key={u.id}>
                  {u.firstName} {u.lastName}
                </li>
              ))
            ) : (
              <li className="text-[var(--muted)]">Пока нет подтверждённых связей</li>
            )}
          </ul>
        </div>
        {showSearch ? (
          <>
            <div className="mt-3 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                placeholder="Введите имя, фамилию или email"
              />
              <button
                onClick={runSearch}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Найти
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {searchResults.map((u) => (
                <li key={u.id} className="flex items-center justify-between rounded-md border border-[var(--surface-border)]/80 p-2">
                  <span>
                    {u.firstName} {u.lastName} ({u.email})
                  </span>
                  {linkedIds.has(u.id) ? (
                    <span className="text-xs text-[var(--muted)]">Связь есть</span>
                  ) : (
                    <button
                      onClick={() => sendFamilyRequest(u.id)}
                      className="rounded bg-[var(--accent-strong)] px-2 py-1 text-white transition-colors hover:bg-[var(--accent-strong-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      Отправить запрос
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        <details>
          <summary className="cursor-pointer list-none text-base font-semibold">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true">❓</span> Как это работает
            </span>
          </summary>
          <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <p>
              Родитель и ребёнок выбирают общую цель. Например: новый велосипед, поездка или любимая игра.
            </p>
            <p>
              Большую цель делим на маленькие шаги. За каждый выполненный шаг ребёнок получает часть суммы.
            </p>
            <p>
              Ребёнок отправляет фото или видео, родитель подтверждает — и деньги за шаг сразу идут в копилку.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
