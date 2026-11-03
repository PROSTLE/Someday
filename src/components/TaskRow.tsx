"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { setItemDone } from "@/app/app/actions";
import { quickAction } from "@/lib/quick";
import type { Item } from "@/lib/types";
import { Bookmark } from "./Bookmark";
import { Icon } from "./Icon";
import { RemoteImage } from "./RemoteImage";

const UNDO_MS = 5000;

export function TaskRow({ item, meta }: { item: Item; meta: string }) {
  const [, start] = useTransition();
  const [done, setDone] = useOptimistic(item.status === "done");
  const [undo, setUndo] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The one thing to do next, so a busy person can act straight from the list.
  const action = item.status === "todo" ? quickAction(item) : null;

  const change = (next: boolean) => {
    setError("");
    clearTimeout(timer.current);
    setUndo(next);
    if (next) timer.current = setTimeout(() => setUndo(false), UNDO_MS);
    start(async () => {
      setDone(next);
      try {
        await setItemDone(item.id, next);
      } catch (e) {
        setUndo(false);
        setError(e instanceof Error ? e.message : "That didn’t save. Please try again.");
      }
    });
  };

  return (
    <li data-surface className="arrive flex min-h-16 items-center gap-3 border-b border-line py-2 pl-3 pr-5">
      <Bookmark done={done} label={item.title} onToggle={() => change(!done)} />
      <div className="min-w-0 flex-1">
        <Link href={`/app/items/${item.id}`} className={`block text-lg font-medium hover:underline ${done ? "text-muted line-through" : ""}`}>
          {item.title}
        </Link>
        <p className="truncate text-sm text-muted">{meta}</p>
        {error && <p role="alert" className="text-sm text-coral">{error}</p>}
      </div>
      {action && !done && !undo && (
        action.external ? (
          <a
            href={action.href}
            target="_blank"
            rel="noreferrer"
            aria-label={action.label}
            title={action.label}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-edge bg-card px-3 text-sm font-semibold hover:bg-tint"
          >
            {action.logo ? <RemoteImage src={action.logo} alt="" className="size-5 rounded" /> : <Icon name={action.icon} size={16} />}
            <span className="hidden max-w-28 truncate sm:inline">{action.short}</span>
          </a>
        ) : (
          <Link
            href={action.href}
            aria-label={action.label}
            title={action.label}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-edge bg-card px-3 text-sm font-semibold hover:bg-tint"
          >
            <Icon name={action.icon} size={16} />
            <span className="hidden max-w-28 truncate sm:inline">{action.short}</span>
          </Link>
        )
      )}
      {undo && (
        <button type="button" onClick={() => change(false)} className="min-h-11 px-2 font-semibold underline">
          Undo
        </button>
      )}
    </li>
  );
}
