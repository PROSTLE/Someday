import Link from "next/link";
import { ReelActions, ReviewActions } from "@/components/ReviewActions";
import { EmptyState, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";
import { ITEM_SELECT, type Item, type List, type Reel } from "@/lib/types";

export default async function Review() {
  const { supabase } = await requireUser();
  const [items, reels, lists] = await Promise.all([
    supabase.from("items").select(ITEM_SELECT).eq("needs_review", true).order("created_at", { ascending: false }),
    supabase.from("reels").select("*").eq("status", "failed").order("created_at", { ascending: false }),
    supabase.from("lists").select("*").order("name"),
  ]);
  const failure = items.error ?? reels.error ?? lists.error;
  if (failure) throw new Error(failure.message);

  const review = (items.data ?? []) as Item[];
  const failed = (reels.data ?? []) as Reel[];

  return (
    <>
      <PageTitle title="Needs a look" sub="Tick wasn’t sure about these." />
      {review.length === 0 && failed.length === 0 && (
        <EmptyState title="All clear" mood="happy">
          <p>Nothing needs your attention.</p>
        </EmptyState>
      )}
      <div className="flex max-w-2xl flex-col gap-3">
        {failed.map((reel) => (
          <article key={reel.id} data-surface className="rounded-[14px] border border-coral bg-card p-4">
            <h2 className="font-medium">A Reel couldn’t be read</h2>
            {reel.caption && <p className="truncate text-sm text-muted">{reel.caption}</p>}
            {reel.error && <p className="mt-1 text-sm">{reel.error}</p>}
            <ReelActions id={reel.id} canRetry={Boolean(reel.media_path || reel.media_url)} />
          </article>
        ))}
        {review.map((item) => (
          <article key={item.id} data-surface className="rounded-[14px] border border-edge bg-card p-4">
            <Link href={`/app/items/${item.id}`} className="font-medium hover:underline">{item.title}</Link>
            {item.summary && <p className="text-sm text-muted">{item.summary}</p>}
            <ReviewActions id={item.id} lists={(lists.data ?? []) as List[]} />
          </article>
        ))}
      </div>
    </>
  );
}
