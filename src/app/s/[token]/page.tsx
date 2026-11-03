import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon, VIEW_ICONS } from "@/components/Icon";
import { RemoteImage } from "@/components/RemoteImage";
import { ButtonLink, Logo, buttonClass } from "@/components/ui";
import { instagramChatUrl } from "@/lib/env";
import { itemChips, itemVisual, quickAction } from "@/lib/quick";
import { readShareToken } from "@/lib/share";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, List } from "@/lib/types";

/** Only what's safe to show a friend: never summaries, evidence, captions or notes. */
const PUBLIC_SELECT = "id, list_id, title, status, due_at, data, lists(name, slug, view)";

async function load(token: string) {
  const listId = readShareToken(decodeURIComponent(token));
  if (!listId) return null;
  const admin = createAdminClient();
  const { data: list } = await admin.from("lists").select("id, name, slug, view, created_at").eq("id", listId).maybeSingle();
  if (!list) return null;
  const { data } = await admin
    .from("items")
    .select(PUBLIC_SELECT)
    .eq("list_id", listId)
    .eq("status", "todo")
    .eq("needs_review", false)
    .order("created_at", { ascending: false })
    .limit(60);
  return { list: list as List, items: (data ?? []) as unknown as Item[] };
}

export async function generateMetadata(props: PageProps<"/s/[token]">): Promise<Metadata> {
  const shared = await load((await props.params).token);
  if (!shared) return { title: "Someday" };
  const count = shared.items.length;
  const image = shared.items.map(itemVisual).find((url) => url?.startsWith("https://"));
  const title = `${shared.list.name} · ${count} ${count === 1 ? "pick" : "picks"} on Someday`;
  return {
    title,
    description: "Saved from Instagram Reels and ready to do: where to watch, how to get there, where to start.",
    openGraph: { title, ...(image ? { images: [image] } : {}) },
    robots: { index: false },
  };
}

export default async function SharedList(props: PageProps<"/s/[token]">) {
  const shared = await load((await props.params).token);
  if (!shared) notFound();
  const { list, items } = shared;
  const chatUrl = instagramChatUrl();

  return (
    <div className="min-h-dvh bg-page">
      <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-8">
        <Logo />
        <div className="flex-1" />
        <ButtonLink href="/signin">Make your own</ButtonLink>
      </nav>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-8">
        <p className="eyebrow">A friend shared their list</p>
        <h1 className="mt-1 font-serif text-4xl sm:text-5xl">{list.name}</h1>
        <p className="mt-1 text-muted">
          {items.length} {items.length === 1 ? "thing" : "things"} saved from Instagram Reels, each one ready to do.
        </p>

        {items.length === 0 ? (
          <p className="mt-8 rounded-[14px] border border-edge bg-card p-6 text-muted">Everything on this list is done.</p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const visual = itemVisual(item);
              const action = quickAction(item);
              const chips = [item.data.year, ...itemChips(item)].filter(Boolean).join(" · ");
              return (
                <li key={item.id} data-surface className="min-w-0">
                  {visual ? (
                    <RemoteImage src={visual} alt="" className="aspect-[3/4] w-full rounded-[12px] object-cover shadow-md" />
                  ) : (
                    <span className="flex aspect-[3/4] w-full flex-col justify-between rounded-[12px] bg-t-yellow p-3">
                      <Icon name={VIEW_ICONS[list.view]} size={26} />
                      <span className="line-clamp-4 font-hand text-[22px] leading-none">{item.title}</span>
                    </span>
                  )}
                  <p className="mt-2 font-medium">{item.title}</p>
                  {chips && <p className="truncate text-sm text-muted">{chips}</p>}
                  {item.data.address && <p className="truncate text-sm text-muted">{item.data.address}</p>}
                  {action?.external && (
                    <a
                      href={action.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-sm font-semibold text-on-primary"
                    >
                      {action.logo ? <RemoteImage src={action.logo} alt="" className="size-5 rounded" /> : <Icon name={action.icon} size={16} />}
                      <span className="truncate">{action.label}</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <section data-surface className="mt-14 rounded-[14px] bg-t-blue p-6 sm:p-8">
          <h2 className="font-serif text-[28px] leading-tight">Your saved Reels, ready to do</h2>
          <p className="mt-2 max-w-xl text-muted">
            Share any Reel to Tick on Instagram. It sorts films, places, recipes and skills into lists like this one, with
            where to watch, how to get there and where to start.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/signin">Start my list</ButtonLink>
            {chatUrl && (
              <a href={chatUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                <Icon name="instagram" /> Message Tick
              </a>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
