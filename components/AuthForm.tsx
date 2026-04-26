"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";
type Role = "PARENT" | "CHILD";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("PARENT");
  const [error, setError] = useState("");
  const [demoLoading, setDemoLoading] = useState<"parent" | "child" | "liza" | "admin" | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      email: form.get("email"),
      password: form.get("password"),
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      role,
    };

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Ошибка запроса");
      return;
    }

    router.push(data.redirectTo ?? "/");
    router.refresh();
  }

  async function loginDemo(kind: "parent" | "child" | "liza" | "admin") {
    const demos = {
      parent: "parent@sk.plus",
      child: "child@sk.plus",
      liza: "liza@sk.plus",
      admin: "admin@sk.plus",
    } as const;
    setError("");
    setDemoLoading(kind);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: demos[kind], password: "12345678" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDemoLoading(null);
      setError(data.error ?? "Не удалось войти в демо-аккаунт");
      return;
    }
    router.push(data.redirectTo ?? "/");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
            mode === "login"
              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              : "bg-[var(--soft)] text-[var(--soft-text)] hover:bg-[var(--soft-hover)]"
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
            mode === "register"
              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              : "bg-[var(--soft)] text-[var(--soft-text)] hover:bg-[var(--soft-hover)]"
          }`}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Пароль (минимум 8)"
          className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        />

        {mode === "register" ? (
          <>
            <input
              name="firstName"
              required
              placeholder="Имя"
              className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            />
            <input
              name="lastName"
              required
              placeholder="Фамилия"
              className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            />
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setRole("PARENT")}
                className={`rounded-md px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                  role === "PARENT"
                    ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    : "bg-[var(--soft)] text-[var(--soft-text)] hover:bg-[var(--soft-hover)]"
                }`}
              >
                Родитель
              </button>
              <button
                type="button"
                onClick={() => setRole("CHILD")}
                className={`rounded-md px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                  role === "CHILD"
                    ? "bg-[var(--accent-strong)] text-white hover:bg-[var(--accent-strong-hover)]"
                    : "bg-[var(--soft)] text-[var(--soft-text)] hover:bg-[var(--soft-hover)]"
                }`}
              >
                Ребёнок
              </button>
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>
      <div className="mt-4 rounded-md border border-[var(--surface-border)] bg-[var(--soft)] p-3">
        <p className="text-xs font-medium text-[var(--soft-text)]">Демо аккаунты</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => loginDemo("parent")}
            disabled={demoLoading !== null}
            className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {demoLoading === "parent" ? "Вход..." : "Родитель"}
          </button>
          <button
            type="button"
            onClick={() => loginDemo("child")}
            disabled={demoLoading !== null}
            className="rounded-md bg-[var(--accent-strong)] px-2 py-1 text-xs text-white transition-colors hover:bg-[var(--accent-strong-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {demoLoading === "child" ? "Вход..." : "Андрей"}
          </button>
          <button
            type="button"
            onClick={() => loginDemo("admin")}
            disabled={demoLoading !== null}
            className="rounded-md bg-[var(--foreground)] px-2 py-1 text-xs text-[var(--background)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {demoLoading === "admin" ? "Вход..." : "Админ"}
          </button>
          <button
            type="button"
            onClick={() => loginDemo("liza")}
            disabled={demoLoading !== null}
            className="col-start-2 rounded-md bg-[var(--accent-strong)] px-2 py-1 text-xs text-white transition-colors hover:bg-[var(--accent-strong-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {demoLoading === "liza" ? "Вход..." : "Лиза"}
          </button>
        </div>
      </div>
    </div>
  );
}
