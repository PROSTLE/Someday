"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icon";
import { ErrorNote, buttonClass } from "./ui";

const BUCKET = "reel-uploads";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "That didn’t work. Please try again.");
  return data;
}

export function UploadReel() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "sent">("idle");
  const [error, setError] = useState("");

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setState("uploading");
    try {
      const { path, token } = await postJson("/api/reels/upload", { size: file.size, type: file.type });
      const { error: uploadError } = await createClient().storage.from(BUCKET).uploadToSignedUrl(path, token, file);
      if (uploadError) throw new Error(uploadError.message);
      await postJson("/api/reels", { path, note });
      setNote("");
      setState("sent");
      router.refresh();
    } catch (e) {
      setState("idle");
      setError(e instanceof Error ? e.message : "That didn’t work. Please try again.");
    }
  };

  return (
    <section data-surface className="rounded-[14px] border border-edge bg-card p-4">
      <h2 className="font-serif text-[22px]">Upload a video</h2>
      <p className="text-sm text-muted">MP4, up to 50 MB. In your screen recording, open the caption and scroll the comments, and Tick will read them too.</p>
      <label className="mt-3 flex flex-col gap-1 text-sm font-medium">
        Why are you saving it? (optional)
        <input
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-11 rounded-[10px] border border-edge bg-page px-4 text-base font-normal"
        />
      </label>
      <input ref={input} type="file" accept="video/mp4" aria-label="Choose a video" onChange={upload} className="hidden" />
      <button
        type="button"
        disabled={state === "uploading"}
        onClick={() => input.current?.click()}
        className={`${buttonClass()} mt-3 w-full`}
      >
        <Icon name="plus" /> {state === "uploading" ? "Uploading…" : "Choose video"}
      </button>
      {state === "sent" && <p role="status" className="mt-2 text-sm text-muted">Tick is watching it now.</p>}
      {error && <div className="mt-2"><ErrorNote message={error} /></div>}
    </section>
  );
}
