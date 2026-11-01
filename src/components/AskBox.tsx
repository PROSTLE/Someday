"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ErrorNote, buttonClass } from "./ui";

type Answer = { answer: string; items: { id: string; title: string }[] };

export function AskBox() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? "Tick couldn’t answer that.");
      else setResult(data);
    } catch {
      setError("Tick couldn’t answer that. Please try again.");
    }
    setBusy(false);
  };

  return (
    <div data-surface className="flex flex-col gap-4">
      <form onSubmit={ask} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={question}
          required
          maxLength={300}
          aria-label="Your question"
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-11 flex-1 rounded-[10px] border border-edge bg-card px-4"
        />
        <button disabled={busy} className={buttonClass()}>{busy ? "Thinking…" : "Ask"}</button>
      </form>
      {error && <ErrorNote message={error} />}
      {result && (
        <div className="paper p-5">
          <p>{result.answer}</p>
          {result.items.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {result.items.map((item) => (
                <li key={item.id}>
                  <Link href={`/app/items/${item.id}`} className="inline-flex min-h-11 items-center underline">{item.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
