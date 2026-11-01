"use client";

import { useOptimistic, useTransition } from "react";
import { updateItemData } from "@/app/app/actions";
import type { Item, Step } from "@/lib/types";
import { Bookmark } from "./Bookmark";

export function StepList({ item }: { item: Item }) {
  const [, start] = useTransition();
  const [steps, setSteps] = useOptimistic<Step[]>(item.data.steps ?? []);

  const toggle = (index: number) => {
    const next = steps.map((step, i) => (i === index ? { ...step, done: !step.done } : step));
    start(async () => {
      setSteps(next);
      await updateItemData(item.id, { ...item.data, steps: next });
    });
  };

  return (
    <section className="mt-5">
      <h2 className="font-serif text-[22px]">Steps</h2>
      <ol>
        {steps.map((step, index) => (
          <li key={index} className="flex items-center gap-2 border-b border-line py-1">
            <Bookmark done={Boolean(step.done)} label={step.text} onToggle={() => toggle(index)} />
            <span className={step.done ? "text-muted line-through" : ""}>{step.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
