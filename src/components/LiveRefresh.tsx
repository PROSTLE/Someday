"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function LiveRefresh({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const filter = `user_id=eq.${userId}`;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let stopped = false;

    const connect = async () => {
      const { data } = await supabase.auth.getSession();
      if (stopped || !data.session) return;
      // Row-level security needs the user's token before events can be delivered.
      await supabase.realtime.setAuth(data.session.access_token);
      if (stopped) return;
      channel = supabase
        .channel(`user-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "items", filter }, () => router.refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "reels", filter }, () => router.refresh())
        .subscribe();
    };

    connect();
    return () => {
      stopped = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
