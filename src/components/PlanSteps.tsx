"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addPlanToToday } from "@/app/app/actions";
import type { PlanStep } from "@/lib/types";
import { ErrorNote, buttonClass } from "./ui";

export function PlanSteps({ steps, itemIds }: { steps: PlanStep[]; itemIds: string[] }) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  return (
    <section className="mt-7">
      <h2 className="font-serif text-[22px]">Your plan</h2>
      <ol className="mt-3 flex flex-col gap-3 border-l-2 border-line pl-5">
        {steps.map((step) => (
          <li key={step.item_id}>
            <p className="eyebrow">{step.time}</p>
            <Link href={`/app/items/${step.item_id}`} className="text-lg font-medium hover:underline">{step.title}</Link>
            <p className="text-muted">{step.why}</p>
          </li>
        ))}
      </ol>
      {error && <div className="mt-3"><ErrorNote message={error} /></div>}
      <button
        type="button"
        disabled={pending || added}
        onClick={() =>
          start(async () => {
            setError("");
            try {
              await addPlanToToday(itemIds);
              setAdded(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : "That didn’t save. Please try again.");
            }
          })
        }
        className={`${buttonClass()} mt-4`}
      >
        {added ? "Added to Today" : "Add all to Today"}
      </button>
    </section>
  );
}
