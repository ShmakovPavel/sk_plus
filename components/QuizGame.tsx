"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
};

const answerLetters = ["А", "Б", "В", "Г"];

export function QuizGame({
  userTag,
  questions,
}: {
  userTag: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [lockedMs, setLockedMs] = useState(0);
  const [firstCorrectLogs, setFirstCorrectLogs] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          nextQuestion();
          return 15;
        }
        return prev - 1;
      });
      setLockedMs((prev) => (prev > 0 ? Math.max(0, prev - 1000) : 0));
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, finished]);

  async function submitAttempt(finalScore: number, finalCorrect: number) {
    await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: finalScore,
        totalQuestions: questions.length,
        correctAnswers: finalCorrect,
      }),
    });
    router.refresh();
  }

  function nextQuestion() {
    if (index >= questions.length - 1) {
      const finalScore = score;
      const finalCorrect = correct;
      setFinished(true);
      void submitAttempt(finalScore, finalCorrect);
      return;
    }
    setIndex((v) => v + 1);
    setTimeLeft(15);
    setLockedMs(0);
  }

  function answer(optionIndex: number) {
    if (lockedMs > 0 || finished) return;
    const q = questions[index];
    if (!q) return;

    if (optionIndex === q.correctIndex) {
      const gained = 50 + timeLeft * 10;
      setScore((s) => s + gained);
      setCorrect((c) => c + 1);

      if (!firstCorrectLogs[q.id]) {
        const letter = answerLetters[optionIndex];
        setFirstCorrectLogs((prev) => ({
          ...prev,
          [q.id]: `${userTag} Дал верный ответ. ${letter} - ${q.options[optionIndex]}`,
        }));
      }

      setTimeout(nextQuestion, 350);
    } else {
      setLockedMs(3000);
    }
  }

  const q = questions[index];

  if (!q) {
    return <p>Не удалось загрузить вопросы.</p>;
  }

  if (finished) {
    return (
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Викторина завершена</h2>
        <p className="mt-2">Очки: {score}</p>
        <p>Правильных ответов: {correct} / {questions.length}</p>
        <button
          className="mt-3 rounded-md bg-zinc-900 px-3 py-2 text-white"
          onClick={() => window.location.reload()}
        >
          Сыграть снова
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>
          Вопрос {index + 1}/{questions.length}
        </span>
        <span>Осталось: {timeLeft} c</span>
      </div>
      <h2 className="mb-4 text-lg font-semibold">{q.text}</h2>

      <div className="grid gap-2 md:grid-cols-2">
        {q.options.map((option, optionIndex) => (
          <button
            key={option}
            onClick={() => answer(optionIndex)}
            disabled={lockedMs > 0}
            className="rounded-md border border-zinc-300 p-3 text-left hover:bg-zinc-100 disabled:opacity-60"
          >
            <span className="font-medium">{answerLetters[optionIndex]}.</span> {option}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-md bg-zinc-100 p-3 text-sm">
        <p className="font-medium">Лог первого правильного ответа</p>
        <p className="mt-1">{firstCorrectLogs[q.id] ?? "Пока нет верного ответа"}</p>
        {lockedMs > 0 ? <p className="mt-2 text-red-600">Неверно. Ответы заблокированы на 3 секунды.</p> : null}
      </div>

      <p className="mt-3 text-sm text-zinc-600">Текущие очки: {score}</p>
    </section>
  );
}
