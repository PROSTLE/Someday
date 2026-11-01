"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { deleteAccount } from "@/app/app/actions";
import { BUBBLES_EVENT, BUBBLES_KEY } from "./Bubbles";
import { ErrorNote, buttonClass } from "./ui";

const subscribe = (notify: () => void) => {
  addEventListener(BUBBLES_EVENT, notify);
  return () => removeEventListener(BUBBLES_EVENT, notify);
};

const readEnabled = () => {
  try {
    return localStorage.getItem(BUBBLES_KEY) !== "off";
  } catch {
    return true;
  }
};

export function BubbleToggle() {
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => true);

  const toggle = () => {
    try {
      localStorage.setItem(BUBBLES_KEY, enabled ? "off" : "on");
    } catch {
      // Without storage the setting can't be remembered.
    }
    dispatchEvent(new Event(BUBBLES_EVENT));
  };

  return (
    <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span>Cursor bubbles</span>
      <input type="checkbox" checked={enabled} onChange={toggle} className="size-5 accent-[var(--teal)]" />
    </label>
  );
}

export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="mt-4 flex flex-col gap-2">
      {error && <ErrorNote message={error} />}
      {confirming ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await deleteAccount();
              } catch (e) {
                if (e instanceof Error && !("digest" in e)) setError(e.message);
                else throw e;
              }
            })
          }
          className={buttonClass("danger")}
        >
          Yes, delete my account and everything in it
        </button>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={buttonClass("danger")}>
          Delete everything
        </button>
      )}
    </div>
  );
}
