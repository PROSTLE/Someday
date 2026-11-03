"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Shares a read-only link to one list, through the phone's share sheet when there is one. */
export function ShareList({ path, name }: { path: string; name: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const share = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} on Someday`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch (error) {
      // Closing the share sheet isn't a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("failed");
    }
  };

  return (
    <div data-surface className="mb-5 flex flex-wrap items-center gap-3 rounded-[14px] border border-edge bg-card p-4">
      <Icon name="arrow" />
      <p className="min-w-0 flex-1">
        <span className="font-medium">Share this list.</span>{" "}
        <span className="text-muted">Friends see the titles, pictures and links, never your notes.</span>
      </p>
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-11 items-center rounded-full border border-edge px-5 font-semibold hover:bg-tint"
      >
        {state === "copied" ? "Link copied" : state === "failed" ? "Couldn’t copy" : "Share list"}
      </button>
    </div>
  );
}
