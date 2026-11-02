"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorNote, buttonClass } from "./ui";

export function PlanBox() {
  const router = useRouter();
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const plan = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: wish }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Tick couldn’t build a plan.");
        setBusy(false);
        return;
      }
      router.push(`/app/items/${data.id}`);
    } catch {
      setError("Tick couldn’t build a plan. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form data-surface onSubmit={plan} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 font-medium">
        What should Tick plan?
        <textarea
          value={wish}
          required
          rows={3}
          maxLength={300}
          placeholder="Plan my Saturday"
          onChange={(e) => setWish(e.target.value)}
          className="rounded-[10px] border border-edge bg-card px-4 py-3 font-normal placeholder:text-muted"
        />
      </label>
      <button disabled={busy} className={buttonClass()}>{busy ? "Tick is planning…" : "Make my plan"}</button>
      {error && <ErrorNote message={error} />}
    </form>
  );
}
