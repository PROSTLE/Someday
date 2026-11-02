"use client";

import { useEffect, useState } from "react";
import type { Step } from "@/lib/types";
import { buttonClass } from "./ui";

export function CookMode({ title, steps }: { title: string; steps: Step[] }) {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIndex(null);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [index]);

  if (index === null) {
    return (
      <button type="button" onClick={() => setIndex(0)} className={`${buttonClass("secondary")} mt-3`}>
        Start step-by-step
      </button>
    );
  }

  const last = index === steps.length - 1;
  return (
    <div role="dialog" aria-modal="true" aria-label={`${title} steps`} className="fixed inset-0 z-50 flex flex-col bg-sheet p-6 sm:p-12">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Step {index + 1} of {steps.length}</p>
        <button type="button" onClick={() => setIndex(null)} className={buttonClass("secondary")}>Close</button>
      </div>
      <p className="my-auto text-center font-serif text-3xl leading-snug sm:text-5xl">{steps[index].text}</p>
      <div className="flex justify-between gap-3">
        <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} className={buttonClass("secondary")}>Back</button>
        <button type="button" onClick={() => setIndex(last ? null : index + 1)} className={buttonClass()}>
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
