"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setItemDone } from "@/app/app/actions";
import type { Item, List } from "@/lib/types";
import { calendarUrl, directionsUrl } from "@/lib/links";
import { Bookmark } from "../Bookmark";
import { Countdown } from "../Countdown";
import { Icon, VIEW_ICONS } from "../Icon";
import { RemoteImage } from "../RemoteImage";
import { MapView } from "./MapView";

function Done({ item }: { item: Item }) {
  const [pending, start] = useTransition();
  return (
    <span className={pending ? "opacity-50" : ""}>
      <Bookmark
        done={item.status === "done"}
        label={item.title}
        onToggle={() => start(() => setItemDone(item.id, item.status !== "done"))}
      />
    </span>
  );
}

/** Shows the most useful real details on a card. Nothing renders if there are none. */
function CardDetails({ item }: { item: Item }) {
  const facts = item.data.facts?.slice(0, 2) ?? [];
  if (!facts.length && !item.data.next_step) return null;
  return (
    <div className="mt-2 text-sm text-muted">
      {facts.map((fact) => <p key={fact.label} className="truncate"><span className="font-medium text-ink">{fact.label}:</span> {fact.value}</p>)}
      {item.data.next_step && <p className="mt-1 truncate text-teal">→ {item.data.next_step}</p>}
    </div>
  );
}

const titleClass = (item: Item) => `font-medium hover:underline ${item.status === "done" ? "text-muted line-through" : ""}`;

function Poster({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.id} data-surface>
          <div className="relative aspect-[2/3] overflow-hidden rounded-[10px] bg-t-blue">
            <Link href={`/app/items/${item.id}`} aria-label={`Open ${item.title}`} className="block size-full transition hover:scale-105">
              {item.data.image_url ? (
                <RemoteImage src={item.data.image_url} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-muted">
                  <Icon name="film" size={36} />
                  <span className="text-sm">Tap to see details</span>
                </span>
              )}
            </Link>
            <span className="absolute right-1 top-1 rounded-lg bg-card/90"><Done item={item} /></span>
          </div>
          <Link href={`/app/items/${item.id}`} className={`mt-2 block ${titleClass(item)}`}>{item.title}</Link>
          <p className="text-sm text-muted">
            {[item.data.year, item.data.rating !== undefined && `★ ${item.data.rating}`].filter(Boolean).join(" · ")}
          </p>
          {item.data.genres && <p className="truncate text-sm text-muted">{item.data.genres.join(", ")}</p>}
          {item.data.watch?.stream[0] && <p className="truncate text-sm font-medium">On {item.data.watch.stream[0]}</p>}
        </article>
      ))}
    </div>
  );
}

function Places({ items }: { items: Item[] }) {
  const pinned = items.filter((i) => typeof i.data.lat === "number" && typeof i.data.lng === "number");
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.id} data-surface className="flex items-center gap-2 rounded-xl border border-edge bg-card py-2 pl-2 pr-3">
            <Done item={item} />
            <div className="min-w-0 flex-1">
              <Link href={`/app/items/${item.id}`} className={`block truncate ${titleClass(item)}`}>{item.title}</Link>
              <p className="truncate text-sm text-muted">{item.data.place_type ?? item.data.address ?? ""}</p>
              {item.data.next_step && <p className="truncate text-sm text-teal">→ {item.data.next_step}</p>}
            </div>
            <a
              href={directionsUrl(item)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Directions to ${item.title}`}
              className="inline-flex size-11 items-center justify-center text-muted"
            >
              <Icon name="arrow" size={20} />
            </a>
          </li>
        ))}
      </ul>
      {pinned.length > 0 ? (
        <MapView items={pinned} />
      ) : (
        <p data-surface className="flex min-h-40 items-center justify-center rounded-[14px] border border-edge bg-tint p-6 text-center text-muted">
          No map pins yet. Use the arrows to open directions.
        </p>
      )}
    </div>
  );
}

function Steps({ items }: { items: Item[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => {
        const steps = item.data.steps ?? [];
        const done = steps.filter((s) => s.done).length;
        return (
          <article key={item.id} data-surface className="paper p-5">
            <Link href={`/app/items/${item.id}`} className={`font-serif text-[22px] ${titleClass(item)}`}>{item.title}</Link>
            {item.data.image_url && (
              <Link href={`/app/items/${item.id}`} aria-label={`Open ${item.title}`}>
                <RemoteImage src={item.data.image_url} alt="" className="mt-2 aspect-video w-full rounded-[10px] object-cover" />
              </Link>
            )}
            {item.summary && <p className="mt-1 text-sm text-muted">{item.summary}</p>}
            {item.data.ingredients && <p className="mt-2 text-sm text-muted">{item.data.ingredients.length} ingredients</p>}
            {steps.length > 0 && <p className="text-sm text-muted">{done} of {steps.length} steps done</p>}
            <CardDetails item={item} />
          </article>
        );
      })}
    </div>
  );
}

function Timeline({ items }: { items: Item[] }) {
  const sorted = [...items].sort((a, b) => (a.due_at ?? "9").localeCompare(b.due_at ?? "9"));
  return (
    <ol className="flex max-w-2xl flex-col gap-3 border-l-2 border-line pl-5">
      {sorted.map((item) => (
        <li key={item.id} data-surface className="rounded-xl border border-edge bg-card p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Link href={`/app/items/${item.id}`} className={titleClass(item)}>{item.title}</Link>
              {item.due_at ? <Countdown at={item.due_at} /> : <p className="text-sm text-muted">No date found</p>}
            </div>
            <Done item={item} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            {item.due_at && (
              <a href={calendarUrl(item)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline">Add to calendar</a>
            )}
            {item.data.source_url && (
              <a href={item.data.source_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline">Check the source</a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Wishlist({ items }: { items: Item[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} data-surface className="rounded-[14px] border border-edge bg-card p-3">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[10px] bg-t-mint text-muted">
            {item.data.image_url ? <RemoteImage src={item.data.image_url} alt="" className="size-full object-cover" /> : <Icon name="bag" size={36} />}
          </div>
          <div className="mt-2 flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <Link href={`/app/items/${item.id}`} className={titleClass(item)}>{item.title}</Link>
              {item.data.price && <p className="text-sm text-muted">{item.data.price}</p>}
              <CardDetails item={item} />
            </div>
            <Done item={item} />
          </div>
          {item.data.url && <a href={item.data.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm underline">Find it</a>}
        </article>
      ))}
    </div>
  );
}

function Gallery({ items }: { items: Item[] }) {
  return (
    <div className="columns-2 gap-4 lg:columns-3">
      {items.map((item) => (
        <article key={item.id} data-surface className="mb-4 break-inside-avoid overflow-hidden rounded-[14px] border border-edge bg-card">
          {item.data.image_url && <RemoteImage src={item.data.image_url} alt="" className="w-full" />}
          <div className="flex items-center gap-1 p-3">
            <Link href={`/app/items/${item.id}`} className={`min-w-0 flex-1 ${titleClass(item)}`}>{item.title}</Link>
            <Done item={item} />
          </div>
        </article>
      ))}
    </div>
  );
}

function Notes({ items, showIcon }: { items: Item[]; showIcon?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <article key={item.id} data-surface className="rounded-[14px] border border-edge bg-card p-5">
          <div className="flex items-start gap-2">
            {showIcon && <Icon name={VIEW_ICONS.fallback} className="mt-0.5 shrink-0 text-muted" />}
            <Link href={`/app/items/${item.id}`} className={`min-w-0 flex-1 text-lg ${titleClass(item)}`}>{item.title}</Link>
            <Done item={item} />
          </div>
          {item.summary && <p className="mt-1 text-muted">{item.summary}</p>}
          {item.data.points && item.data.points.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-muted">
              {item.data.points.slice(0, 4).map((point) => <li key={point}>{point}</li>)}
            </ul>
          )}
          <CardDetails item={item} />
        </article>
      ))}
    </div>
  );
}

export function ListView({ list, items }: { list: List; items: Item[] }) {
  switch (list.view) {
    case "poster": return <Poster items={items} />;
    case "map": return <Places items={items} />;
    case "steps": return <Steps items={items} />;
    case "timeline": return <Timeline items={items} />;
    case "wishlist": return <Wishlist items={items} />;
    case "gallery": return <Gallery items={items} />;
    case "notes": return <Notes items={items} />;
    default: return <Notes items={items} showIcon />;
  }
}
