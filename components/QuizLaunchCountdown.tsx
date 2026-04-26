"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  launchAtIso: string;
  currentLaunchId?: string | null;
  showTimer?: boolean;
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function QuizLaunchCountdown({ launchAtIso, currentLaunchId = null, showTimer = true }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchAtMs = useMemo(() => new Date(launchAtIso).getTime(), [launchAtIso]);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, launchAtMs - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingMs(Math.max(0, launchAtMs - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [launchAtMs]);

  useEffect(() => {
    const checkLaunch = async () => {
      const res = await fetch("/api/quiz/current-launch", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const liveParam = searchParams.get("live");
      const hasActiveLaunch = Boolean(data.launchAvailable && typeof data.launchId === "string" && data.launchId);
      if (hasActiveLaunch && liveParam !== "1") {
        router.replace("/quiz?live=1");
        return;
      }

      if (
        liveParam === "1" &&
        typeof data.launchId === "string" &&
        data.launchId &&
        data.launchId !== currentLaunchId
      ) {
        router.replace("/quiz?live=1");
      }
    };

    void checkLaunch();
    const poll = setInterval(checkLaunch, 1000);
    return () => clearInterval(poll);
  }, [currentLaunchId, router, searchParams]);

  if (!showTimer) return null;

  return (
    <div className="mt-3 rounded-xl border border-[var(--accent)]/35 bg-[var(--accent)]/10 p-4 text-center">
      <p className="text-4xl font-extrabold text-[var(--accent)]">{formatRemaining(remainingMs)}</p>
    </div>
  );
}
