"use client";

import { useState, useTransition } from "react";
import { deleteList, renameList } from "@/app/app/actions";
import { ErrorNote, buttonClass } from "./ui";

export function ListSettings({ id, name }: { id: string; name: string }) {
  const [value, setValue] = useState(name);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const run = (action: () => Promise<void>) =>
    start(async () => {
      setError("");
      try {
        await action();
      } catch (e) {
        if (e instanceof Error && !("digest" in e)) setError(e.message);
        else throw e;
      }
    });

  return (
    <details data-surface className="mt-10 max-w-xl rounded-[14px] border border-edge bg-card px-5 py-3">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">List settings</summary>
      <div className="flex flex-col gap-3 pb-3 pt-2">
        {error && <ErrorNote message={error} />}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-11 rounded-[10px] border border-edge bg-page px-4 text-base font-normal"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={pending} onClick={() => run(() => renameList(id, value))} className={buttonClass("secondary")}>
            Rename
          </button>
          {confirming ? (
            <button type="button" disabled={pending} onClick={() => run(() => deleteList(id))} className={buttonClass("danger")}>
              Yes, delete list
            </button>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={buttonClass("danger")}>Delete list</button>
          )}
        </div>
        <p className="text-sm text-muted">Deleting a list keeps its items, marked as Unsorted.</p>
      </div>
    </details>
  );
}
