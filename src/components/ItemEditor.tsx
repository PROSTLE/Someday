"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteItem, moveItem, setItemDone, updateItem } from "@/app/app/actions";
import type { Item, List } from "@/lib/types";
import { ErrorNote, buttonClass } from "./ui";

export function ItemEditor({ item, lists }: { item: Item; lists: List[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<void>, after?: () => void) =>
    start(async () => {
      setError("");
      setSaved(false);
      try {
        await action();
        after?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That didn’t save. Please try again.");
      }
    });

  const done = item.status === "done";
  const input = "min-h-11 rounded-[10px] border border-edge bg-page px-4 py-2 text-base font-normal";

  return (
    <div className="mt-5 flex flex-col gap-3">
      {error && <ErrorNote message={error} />}
      <button type="button" disabled={pending} onClick={() => run(() => setItemDone(item.id, !done))} className={buttonClass()}>
        {done ? "Mark as not done" : "Mark as done"}
      </button>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Move to
        <select
          value={item.list_id ?? ""}
          disabled={pending}
          onChange={(e) => run(() => moveItem(item.id, e.target.value || null))}
          className={input}
        >
          <option value="">Unsorted</option>
          {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select>
      </label>
      <details className="rounded-[10px] border border-edge px-4 py-2">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">Edit details</summary>
        <div className="flex flex-col gap-3 py-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Summary
            <textarea value={summary} rows={3} onChange={(e) => setSummary(e.target.value)} className={input} />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => updateItem(item.id, { title, summary }), () => setSaved(true))}
            className={buttonClass("secondary")}
          >
            {saved ? "Saved" : "Save changes"}
          </button>
          {confirming ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteItem(item.id), () => router.push("/app"))}
              className={buttonClass("danger")}
            >
              Yes, delete this item
            </button>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={buttonClass("danger")}>Delete item</button>
          )}
        </div>
      </details>
    </div>
  );
}
