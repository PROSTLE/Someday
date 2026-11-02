"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TitleCandidate } from "@/lib/types";
import { RemoteImage } from "./RemoteImage";
import { Tick } from "./Tick";
import { ErrorNote, buttonClass } from "./ui";

async function enrich(id: string, body: object) {
  const response = await fetch(`/api/items/${id}/enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Tick couldn’t find details right now.");
}

/** Fills in saves made before these details existed, once, when the page opens. */
export function AutoEnrich({ id }: { id: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    enrich(id, {})
      .then(() => router.refresh())
      .catch((e: Error) => {
        started.current = false;
        setError(e.message);
      });
  }, [id, router, attempt]);

  if (error) {
    return (
      <div className="mb-5 flex flex-col gap-2">
        <ErrorNote message={error} />
        <button
          type="button"
          onClick={() => {
            setError("");
            setAttempt(attempt + 1);
          }}
          className={buttonClass("secondary")}
        >
          Try again
        </button>
      </div>
    );
  }
  return (
    <div role="status" className="mb-5 flex items-center gap-3 rounded-[14px] bg-t-yellow p-4">
      <Tick mood="watching" size={44} />
      <p className="font-medium">Tick is finding the details…</p>
    </div>
  );
}

export function TitlePicker({ id, candidates }: { id: string; candidates: TitleCandidate[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const pick = async (candidate: number) => {
    setBusy(candidate);
    setError("");
    try {
      await enrich(id, { pick: candidate });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn’t work. Please try again.");
      setBusy(null);
    }
  };

  return (
    <section className="mb-6 rounded-[14px] bg-t-yellow p-5">
      <h2 className="font-serif text-[22px]">Which one did you mean?</h2>
      <p className="text-sm text-muted">More than one title has this name.</p>
      {error && <div className="mt-2"><ErrorNote message={error} /></div>}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => pick(candidate.id)}
              className="w-full overflow-hidden rounded-[10px] border border-edge bg-card text-left hover:bg-tint disabled:opacity-60"
            >
              {candidate.image_url ? (
                <RemoteImage src={candidate.image_url} alt="" className="aspect-[2/3] w-full object-cover" />
              ) : (
                <span className="block aspect-[2/3] w-full bg-tint" />
              )}
              <span className="block px-2 pt-2 font-medium">{candidate.title}</span>
              <span className="block px-2 pb-2 text-sm text-muted">
                {candidate.media_type === "tv" ? "TV show" : "Movie"}{candidate.year ? ` · ${candidate.year}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
