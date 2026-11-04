"use client";

import Link from "next/link";
import { useState } from "react";
import { ACTION_GROUPS, itemChips, itemVisual, quickAction, type QuickAction } from "@/lib/quick";
import type { Item } from "@/lib/types";
import { Icon, VIEW_ICONS } from "./Icon";
import { RemoteImage } from "./RemoteImage";

const SHELF_SIZE = 16;
const TILE_TINTS = ["bg-t-yellow", "bg-t-blue", "bg-t-pink", "bg-t-lavender", "bg-t-mint"];
const KIND_TINT: Record<QuickAction["kind"], string> = {
  watch: "bg-coral text-white",
  learn: "bg-lavender text-white",
  play: "bg-primary text-on-primary",
  go: "bg-teal text-white",
  cook: "bg-yellow text-ink",
  date: "bg-sky text-white",
  shop: "bg-primary text-on-primary",
  open: "bg-primary text-on-primary",
};

/** Takes one item from each list in turn, so the shelf shows a mix rather than ten films in a row. */
function interleave(items: Item[]) {
  const byList = new Map<string, Item[]>();
  for (const item of items) {
    const key = item.list_id ?? "none";
    byList.set(key, [...(byList.get(key) ?? []), item]);
  }
  const queues = [...byList.values()];
  const mixed: Item[] = [];
  while (queues.some((queue) => queue.length)) {
    for (const queue of queues) if (queue.length) mixed.push(queue.shift()!);
  }
  return mixed;
}

function ActionButton({ action }: { action: QuickAction }) {
  const className = `mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition hover:brightness-110 ${KIND_TINT[action.kind]}`;
  const content = (
    <>
      {action.logo ? (
        <RemoteImage src={action.logo} alt="" className="size-5 rounded" />
      ) : (
        <Icon name={action.icon} size={16} />
      )}
      <span className="truncate">{action.short}</span>
    </>
  );
  return action.external ? (
    <a href={action.href} target="_blank" rel="noreferrer" aria-label={action.label} title={action.label} className={className}>
      {content}
    </a>
  ) : (
    <Link href={action.href} aria-label={action.label} className={className}>{content}</Link>
  );
}

export function ReadyShelf({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<(typeof ACTION_GROUPS)[number]["key"]>("all");
  const ready = interleave(items)
    .map((item) => ({ item, action: quickAction(item), visual: itemVisual(item) }))
    .filter((entry) => entry.action || entry.visual);
  const kinds = new Set(ready.map((entry) => entry.action?.kind));
  const groups = ACTION_GROUPS.filter((group) => group.key === "all" || kinds.has(group.key));
  const shown = ready.filter((entry) => filter === "all" || entry.action?.kind === filter).slice(0, SHELF_SIZE);

  if (ready.length === 0) return null;
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-[28px] leading-tight">Ready when you are</h2>
          <p className="text-sm text-muted">One tap to start. No more “someday”.</p>
        </div>
        {groups.length > 2 && (
          <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
            {groups.map((group) => (
              <button
                key={group.key}
                type="button"
                aria-pressed={filter === group.key}
                onClick={() => setFilter(group.key)}
                className={`min-h-9 rounded-full border px-3.5 text-sm font-medium transition ${
                  filter === group.key ? "border-primary bg-primary text-on-primary" : "border-edge bg-card hover:bg-tint"
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="-mx-2 mt-1 flex snap-x gap-4 overflow-x-auto px-2 pt-3 pb-3">
        {shown.map(({ item, action, visual }, index) => {
          const chips = itemChips(item);
          return (
            <li key={item.id} data-surface className="arrive w-36 shrink-0 snap-start sm:w-40">
              <Link href={`/app/items/${item.id}`} className="shelf-card group block rounded-[12px]">
                <span className="relative block overflow-hidden rounded-[12px] shadow-md group-hover:shadow-xl">
                  {visual ? (
                    <RemoteImage src={visual} alt="" className="aspect-[3/4] w-full object-cover" />
                  ) : (
                    <span className={`flex aspect-[3/4] w-full flex-col justify-between p-3 ${TILE_TINTS[index % TILE_TINTS.length]}`}>
                      <Icon name={VIEW_ICONS[item.lists?.view ?? "fallback"]} size={26} />
                      <span className="line-clamp-4 font-hand text-[22px] leading-none">{item.title}</span>
                    </span>
                  )}
                  {item.data.rating ? (
                    <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
                      ★ {item.data.rating.toFixed(1)}
                    </span>
                  ) : null}
                  {item.lists && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pt-8 pb-2 text-xs font-medium text-white">
                      {chips.length ? chips.join(" · ") : item.lists.name}
                    </span>
                  )}
                </span>
                <span className="mt-2 block truncate text-sm font-medium" title={item.title}>{item.title}</span>
              </Link>
              {action && <ActionButton action={action} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
