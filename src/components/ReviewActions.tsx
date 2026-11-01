"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteItem, moveItem } from "@/app/app/actions";
import type { List } from "@/lib/types";
import { ErrorNote, buttonClass } from "./ui";

export function ReelActions({ id, canRetry }: { id: string; canRetry: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const call = (method: "POST" | "DELETE") =>
    start(async () => {
      setError("");
      const response = await fetch(`/api/reels/${id}`, { method });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "That didn’t work. Please try again.");
        return;
      }
      router.refresh();
    });

  return (
    <div className="mt-2 flex flex-col gap-2">
      {error && <ErrorNote message={error} />}
      <div className="flex flex-wrap gap-2">
        {canRetry && (
          <button type="button" disabled={pending} onClick={() => call("POST")} className={buttonClass("secondary")}>
            Retry
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => call("DELETE")} className={buttonClass("danger")}>
          Remove
        </button>
      </div>
    </div>
  );
}

export function ReviewActions({ id, lists }: { id: string; lists: List[] }) {
  const [listId, setListId] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (action: () => Promise<void>) => start(() => action().catch((e: Error) => setError(e.message)));

  return (
    <div className="mt-3 flex flex-col gap-2">
      {error && <ErrorNote message={error} />}
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Choose a list"
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          className="min-h-11 flex-1 rounded-[10px] border border-edge bg-page px-3"
        >
          <option value="">Keep unsorted</option>
          {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select>
        <button type="button" disabled={pending} onClick={() => run(() => moveItem(id, listId || null))} className={buttonClass()}>
          Looks right
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => deleteItem(id))} className={buttonClass("danger")}>
          Remove
        </button>
      </div>
    </div>
  );
}
