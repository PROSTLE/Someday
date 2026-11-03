"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 3000;

/**
 * Linking finishes inside Instagram, so this page can't see it happen. It checks the profile
 * every few seconds and whenever the person returns to the tab, then moves on to the list.
 */
export function LinkWatcher({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let done = false;

    const check = async () => {
      if (done || document.visibilityState !== "visible") return;
      const { data } = await supabase.from("profiles").select("instagram_id").eq("id", userId).maybeSingle();
      if (!done && data?.instagram_id) {
        done = true;
        router.replace("/app");
      }
    };

    const timer = window.setInterval(check, POLL_MS);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => {
      done = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router, userId]);

  return null;
}
