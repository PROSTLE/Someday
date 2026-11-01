"use client";

import { Tick } from "@/components/Tick";
import { buttonClass } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Tick mood="watching" size={120} />
      <h1 className="font-serif text-[32px]">Something went wrong</h1>
      <p className="max-w-md text-muted">{error.message}</p>
      <button type="button" onClick={reset} className={buttonClass()}>Try again</button>
    </div>
  );
}
