"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const noTime = () => null;

export function Countdown({ at }: { at: string }) {
  const now = useSyncExternalStore(subscribe, currentMinute, noTime);
  if (now === null) return <p className="h-5" />;
  const date = new Date(at);
  const days = Math.ceil((date.getTime() - now) / 86_400_000);
  const label = days < 0 ? "Passed" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days left`;
  return (
    <p className="text-sm text-muted">
      {label} · {date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
    </p>
  );
}
