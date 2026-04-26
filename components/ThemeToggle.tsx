"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function nextTheme(theme: Theme): Theme {
  return theme === "light" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme | undefined) ?? "light";
    setTheme(current);
    setMounted(true);
  }, []);

  function onToggle() {
    const updated = nextTheme(theme);
    document.documentElement.dataset.theme = updated;
    localStorage.setItem("theme", updated);
    setTheme(updated);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid size-9 place-items-center rounded-full border border-[var(--input-border)] bg-[var(--surface)] text-[var(--soft-text)] opacity-75 transition hover:bg-[var(--soft)] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      aria-label={mounted && theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
      title={mounted && theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    >
      {mounted && theme === "dark" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
          <path d="M12 5a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13ZM5 11a1 1 0 0 1 1 1 1 1 0 1 1-2 0 1 1 0 0 1 1-1Zm14 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-2.36-5.05a1 1 0 0 1 1.42 0l.86.86a1 1 0 0 1-1.42 1.42l-.86-.86a1 1 0 0 1 0-1.42Zm-10.28 0a1 1 0 0 1 0 1.42l-.86.86a1 1 0 1 1-1.42-1.42l.86-.86a1 1 0 0 1 1.42 0ZM18.92 16.77a1 1 0 0 1 0 1.41l-.86.86a1 1 0 0 1-1.41-1.41l.85-.86a1 1 0 0 1 1.42 0Zm-14.84 0a1 1 0 0 1 1.42 0l.85.86a1 1 0 0 1-1.41 1.41l-.86-.86a1 1 0 0 1 0-1.41Z" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
          <path d="M14.8 3.5a1 1 0 0 1 .92 1.4A7.5 7.5 0 1 0 19.1 15a1 1 0 0 1 1.4.92A9.5 9.5 0 1 1 13.9 3.3a1 1 0 0 1 .9.2Z" />
        </svg>
      )}
    </button>
  );
}
