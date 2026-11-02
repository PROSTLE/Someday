import { HomeBoard } from "@/components/HomeBoard";
import { instagramChatUrl } from "@/lib/env";
import { coverUrls } from "@/lib/pipeline/covers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { ITEM_SELECT, type Item, type List, type Reel } from "@/lib/types";

const recentCutoff = () => new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

export default async function Home() {
  const { supabase, user } = await requireUser();
  const dayAgo = recentCutoff();

  const [items, reels, profile, lists, openCounts, covers] = await Promise.all([
    supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("needs_review", false)
      .or(`status.eq.todo,done_at.gte.${dayAgo}`)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("reels").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("display_name, instagram_id").eq("id", user.id).maybeSingle(),
    supabase.from("lists").select("*").order("created_at"),
    supabase.from("items").select("list_id").eq("status", "todo").eq("needs_review", false),
    coverUrls(createAdminClient(), user.id),
  ]);

  const failure = items.error ?? reels.error ?? profile.error ?? lists.error ?? openCounts.error;
  if (failure) throw new Error(failure.message);

  return (
    <HomeBoard
      items={(items.data ?? []) as Item[]}
      reels={(reels.data ?? []) as Reel[]}
      name={profile.data?.display_name ?? null}
      connected={Boolean(profile.data?.instagram_id)}
      chatUrl={instagramChatUrl()}
      covers={covers}
      lists={((lists.data ?? []) as List[]).map((list) => ({
        ...list,
        open_count: (openCounts.data ?? []).filter((row) => row.list_id === list.id).length,
      }))}
    />
  );
}
