import Link from "next/link";
import { createList } from "@/app/app/actions";
import { Icon, VIEW_ICONS } from "@/components/Icon";
import { EmptyState, PageTitle, buttonClass } from "@/components/ui";
import { RemoteImage } from "@/components/RemoteImage";
import { coverUrls } from "@/lib/pipeline/covers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { VIEWS, VIEW_LABELS, type List } from "@/lib/types";

export default async function Lists() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("lists").select("*, items(count)").order("created_at");
  if (error) throw new Error(error.message);
  const lists = (data ?? []) as (List & { items: { count: number }[] })[];
  const covers = await coverUrls(createAdminClient(), user.id);

  return (
    <>
      <PageTitle title="Your lists" sub="Tick creates these from what you send. You can add your own too." />
      {lists.length === 0 ? (
        <EmptyState title="No lists yet">
          <p>Your first Reel creates your first list.</p>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {lists.map((list) => (
            <Link key={list.id} href={`/app/lists/${list.slug}`} data-surface className="overflow-hidden rounded-[14px] border border-edge bg-card hover:bg-tint">
              {covers[list.id] ? (
                <RemoteImage src={covers[list.id]} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <span className="flex aspect-video w-full items-center justify-center bg-t-blue"><Icon name={VIEW_ICONS[list.view]} size={30} /></span>
              )}
              <h2 className="px-4 pt-3 font-serif text-[22px]">{list.name}</h2>
              <p className="px-4 pb-4 text-sm text-muted">{list.items[0]?.count ?? 0} items</p>
            </Link>
          ))}
        </div>
      )}

      <form action={createList} data-surface className="mt-8 flex max-w-2xl flex-col gap-3 rounded-[14px] border border-edge bg-card p-5 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          New list
          <input name="name" required maxLength={60} className="min-h-11 rounded-[10px] border border-edge bg-page px-4 text-base font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          View
          <select name="view" defaultValue="notes" className="min-h-11 rounded-[10px] border border-edge bg-page px-3 text-base font-normal">
            {VIEWS.map((view) => <option key={view} value={view}>{VIEW_LABELS[view]}</option>)}
          </select>
        </label>
        <button className={buttonClass()}>Create</button>
      </form>
    </>
  );
}
