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

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-2 text-sm ${
            mode === "login" ? "bg-zinc-900 text-white" : "bg-zinc-100"
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-2 text-sm ${
            mode === "register" ? "bg-zinc-900 text-white" : "bg-zinc-100"
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
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Пароль (минимум 8)"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />

        {mode === "register" ? (
          <>
            <input
              name="firstName"
              required
              placeholder="Имя"
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
            <input
              name="lastName"
              required
              placeholder="Фамилия"
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setRole("PARENT")}
                className={`rounded-md px-3 py-2 ${
                  role === "PARENT" ? "bg-emerald-600 text-white" : "bg-zinc-100"
                }`}
              >
                Родитель
              </button>
              <button
                type="button"
                onClick={() => setRole("CHILD")}
                className={`rounded-md px-3 py-2 ${
                  role === "CHILD" ? "bg-blue-600 text-white" : "bg-zinc-100"
                }`}
              >
                Ребёнок
              </button>
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="w-full rounded-md bg-zinc-900 px-3 py-2 text-white">
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>
      <p className="mt-4 text-xs text-zinc-500">
        Для демо после `prisma:seed`: parent@sk.plus / child@sk.plus / admin@sk.plus, пароль 12345678.
      </p>
    </div>
  );
}
