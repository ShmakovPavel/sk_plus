"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type LiveQuestion = {
  id: string;
  text: string;
  options: string[];
  category: string;
};

type LiveState =
  | { status: "loading" }
  | { status: "not_found" }
  | {
      status: "finished";
      score: number;
      correctAnswers: number;
      totalQuestions: number;
    }
  | {
      status: "active";
      currentQuestionIndex: number;
      remainingSeconds: number;
      hasAnsweredCurrentCorrectly: boolean;
      score: number;
      correctAnswers: number;
      totalQuestions: number;
      question: LiveQuestion;
      firstCorrectLog: string | null;
    };

const answerLetters = ["А", "Б", "В", "Г"] as const;

export function QuizGame({
  launchId,
}: {
  launchId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<LiveState>({ status: "loading" });
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [submittingFinish, setSubmittingFinish] = useState(false);
  const [introCountdown, setIntroCountdown] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedResult, setSelectedResult] = useState<"correct" | "wrong" | null>(null);
  const [wrongLocked, setWrongLocked] = useState(false);
  const [wrongLockSeconds, setWrongLockSeconds] = useState(0);
  const [firstCorrectHistory, setFirstCorrectHistory] = useState<string[]>([]);
  const finalizedRef = useRef(false);
  const lastQuestionIdRef = useRef<string | null>(null);
  const loggedQuestionIdsRef = useRef<Set<string>>(new Set());
  const wrongUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refreshState() {
    const res = await fetch(`/api/quiz/live-state?launchId=${encodeURIComponent(launchId)}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ status: "not_found" });
      return;
    }
    if (data.status === "not_found") {
      setState({ status: "not_found" });
      return;
    }
    if (data.status === "finished") {
      setState({
        status: "finished",
        score: Number(data.score ?? 0),
        correctAnswers: Number(data.correctAnswers ?? 0),
        totalQuestions: Number(data.totalQuestions ?? 0),
      });
      return;
    }
    setState({
      status: "active",
      currentQuestionIndex: Number(data.currentQuestionIndex ?? 0),
      remainingSeconds: Number(data.remainingSeconds ?? 0),
      hasAnsweredCurrentCorrectly: Boolean(data.hasAnsweredCurrentCorrectly),
      score: Number(data.score ?? 0),
      correctAnswers: Number(data.correctAnswers ?? 0),
      totalQuestions: Number(data.totalQuestions ?? 0),
      question: {
        id: String(data.question?.id ?? ""),
        text: String(data.question?.text ?? ""),
        category: String(data.question?.category ?? ""),
        options: Array.isArray(data.question?.options) ? data.question.options.map(String) : [],
      },
      firstCorrectLog: data.firstCorrectLog ? String(data.firstCorrectLog) : null,
    });
  }

  async function finalizeAttempt() {
    if (finalizedRef.current || submittingFinish) return;
    finalizedRef.current = true;
    setSubmittingFinish(true);
    try {
      await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchId }),
      });
    } finally {
      setSubmittingFinish(false);
    }
  }

  useEffect(() => {
    const setupIntro = setTimeout(() => {
      try {
        const introKey = `quiz_intro_seen_${launchId}`;
        const alreadySeen = window.sessionStorage.getItem(introKey) === "1";
        if (!alreadySeen) {
          window.sessionStorage.setItem(introKey, "1");
          setIntroCountdown(3);
        }
      } catch {
        setIntroCountdown(3);
      }
    }, 0);

    const kickoff = setTimeout(() => {
      void refreshState();
    }, 0);
    const poll = setInterval(() => {
      void refreshState();
    }, 1000);
    return () => {
      clearTimeout(setupIntro);
      clearTimeout(kickoff);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchId]);

  useEffect(() => {
    if (introCountdown <= 0) return;
    const timer = setTimeout(() => {
      setIntroCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [introCountdown]);

  useEffect(() => {
    if (wrongLockSeconds <= 0) return;
    const timer = setTimeout(() => {
      setWrongLockSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [wrongLockSeconds]);

  useEffect(() => {
    return () => {
      if (wrongUnlockTimerRef.current) {
        clearTimeout(wrongUnlockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (state.status === "not_found") {
      router.push("/quiz");
    }
  }, [router, state.status]);

  useEffect(() => {
    if (state.status === "finished") {
      void finalizeAttempt().finally(() => {
        router.push("/quiz");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, state.status]);

  useEffect(() => {
    if (state.status !== "active") return;
    if (lastQuestionIdRef.current !== state.question.id) {
      lastQuestionIdRef.current = state.question.id;
      setSelectedOption(null);
      setSelectedResult(null);
      setWrongLocked(false);
      setWrongLockSeconds(0);
      if (wrongUnlockTimerRef.current) {
        clearTimeout(wrongUnlockTimerRef.current);
        wrongUnlockTimerRef.current = null;
      }
    }
  }, [state]);

  useEffect(() => {
    if (state.status !== "active") return;
    if (!state.firstCorrectLog) return;
    if (loggedQuestionIdsRef.current.has(state.question.id)) return;
    loggedQuestionIdsRef.current.add(state.question.id);
    setFirstCorrectHistory((prev) => [state.firstCorrectLog!, ...prev]);
  }, [state]);

  async function answer(optionIndex: number) {
    if (state.status !== "active" || state.hasAnsweredCurrentCorrectly || wrongLocked || submittingAnswer) return;
    setSubmittingAnswer(true);
    setSelectedOption(optionIndex);
    setSelectedResult(null);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId,
          questionId: state.question.id,
          optionIndex,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSelectedResult("wrong");
      } else if (data.stale) {
        setSelectedResult("wrong");
      } else if (data.correct === false) {
        setSelectedResult("wrong");
        setWrongLocked(true);
        setWrongLockSeconds(3);
        if (wrongUnlockTimerRef.current) {
          clearTimeout(wrongUnlockTimerRef.current);
        }
        wrongUnlockTimerRef.current = setTimeout(() => {
          setWrongLocked(false);
          setWrongLockSeconds(0);
          setSelectedOption(null);
          setSelectedResult(null);
        }, 3000);
      } else if (data.correct === true || data.alreadyCorrect) {
        setSelectedResult("correct");
      }
    } finally {
      setSubmittingAnswer(false);
      await refreshState();
    }
  }

  if (state.status === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-3 sm:p-6">
        <section className="w-full max-w-3xl rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
          <p>Подключаемся к игре... Почти готово!</p>
        </section>
      </div>
    );
  }

  if (state.status === "finished") {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-3 sm:p-6">
        <section className="w-full max-w-3xl rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Раунд завершён</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {submittingFinish ? "Сохраняем результат..." : "Переходим к следующему раунду..."}
          </p>
        </section>
      </div>
    );
  }

  if (state.status !== "active" || !state.question.id) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-3 sm:p-6">
        <section className="w-full max-w-3xl rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
          <p>Раунд остановлен или не найден.</p>
          <button
            className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            onClick={() => router.push("/quiz")}
          >
            Вернуться
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-3 sm:p-6">
      <section className="w-full max-w-4xl rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
        {introCountdown > 0 ? (
          <div className="mb-4 rounded-lg border border-[var(--surface-border)] bg-[var(--soft)] p-6 text-center">
            <p className="text-sm text-[var(--muted)]">Готовься, сейчас начнём!</p>
            <p className="mt-1 text-4xl font-bold text-[var(--accent)]">{introCountdown}</p>
          </div>
        ) : null}
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>
            Вопрос {state.currentQuestionIndex + 1} из {state.totalQuestions}
          </span>
          <span>Осталось времени: {state.remainingSeconds} c</span>
        </div>
        <h2 className="mb-4 text-lg font-semibold">{state.question.text}</h2>

        <div className="grid gap-2 md:grid-cols-2">
          {state.question.options.map((option, optionIndex) => {
            const isSelected = selectedOption === optionIndex;
            const isCorrectPick = isSelected && selectedResult === "correct";
            const isWrongPick = isSelected && selectedResult === "wrong";
            const colorClass = isCorrectPick
              ? "border-emerald-500 bg-emerald-500/20"
              : isWrongPick
                ? "border-red-500 bg-red-500/20"
                : "border-[var(--input-border)]";

            return (
            <button
              key={option}
              onClick={() => answer(optionIndex)}
              disabled={introCountdown > 0 || state.hasAnsweredCurrentCorrectly || wrongLocked || submittingAnswer}
              className={`rounded-md border p-3 text-left transition-colors hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${colorClass}`}
            >
              <span className="font-medium">{answerLetters[optionIndex]}.</span> {option}
            </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-md bg-[var(--soft)] p-3 text-sm">
          {firstCorrectHistory.length ? (
            <ul className="space-y-1">
              {firstCorrectHistory.map((entry, idx) => (
                <li key={`${entry}-${idx}`}>{entry}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <p className="mt-3 text-sm text-[var(--muted)]">Твои очки сейчас: {state.score}</p>
      </section>
    </div>
  );
}
