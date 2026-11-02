"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Item, ListWithCount } from "@/lib/types";
import { Icon, VIEW_ICONS } from "./Icon";
import { RemoteImage } from "./RemoteImage";

const FORGOTTEN_AFTER_MS = 7 * 86_400_000;
const SHELF_SIZE = 8;
const TINTS = ["bg-t-blue", "bg-t-yellow", "bg-t-pink", "bg-t-lavender", "bg-t-mint"];
const subscribe = () => () => {};
const currentHour = () => Math.floor(Date.now() / 3_600_000) * 3_600_000;
const noTime = () => null;

export function HomeShelf({
  items,
  lists,
  covers,
}: {
  items: Item[];
  lists: ListWithCount[];
  covers: Record<string, string>;
}) {
  const now = useSyncExternalStore(subscribe, currentHour, noTime);
  const open = items.filter((item) => item.status === "todo");
  const shelf = open.filter((item) => item.data.image_url).slice(0, SHELF_SIZE);
  const forgotten =
    now === null
      ? undefined
      : open
          .filter((item) => now - new Date(item.created_at).getTime() > FORGOTTEN_AFTER_MS)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];

  return (
    <div className="mt-8 flex flex-col gap-8">
      {forgotten && (
        <Link href={`/app/items/${forgotten.id}`} data-surface className="flex items-center gap-3 rounded-[14px] bg-t-pink p-4">
          <Icon name="idea" />
          <span>
            <span className="block text-sm text-muted">Remember this?</span>
            <span className="font-medium">{forgotten.title}</span>
          </span>
          <Icon name="arrow" size={18} className="ml-auto shrink-0" />
        </Link>
      )}

      {shelf.length > 0 && (
        <section>
          <h2 className="font-serif text-[28px]">Your shelf</h2>
          <ul className="mt-3 flex gap-4 overflow-x-auto pb-2">
            {shelf.map((item) => (
              <li key={item.id} data-surface className="w-32 shrink-0">
                <Link href={`/app/items/${item.id}`}>
                  <RemoteImage src={item.data.image_url!} alt="" className="aspect-[2/3] w-full rounded-[10px] object-cover shadow-md" />
                  <span className="mt-1.5 block truncate text-sm font-medium">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lists.length > 0 && (
        <section>
          <h2 className="font-serif text-[28px]">Your lists</h2>
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {lists.map((list, index) => (
              <li key={list.id} data-surface>
                <Link href={`/app/lists/${list.slug}`} className="block overflow-hidden rounded-[14px] border border-edge bg-card hover:bg-tint">
                  {covers[list.id] ? (
                    <RemoteImage src={covers[list.id]} alt="" className="aspect-video w-full object-cover" />
                  ) : (
                    <span className={`flex aspect-video w-full items-center justify-center ${TINTS[index % TINTS.length]}`}>
                      <Icon name={VIEW_ICONS[list.view]} size={30} />
                    </span>
                  )}
                  <span className="block px-3 pt-2 font-medium">{list.name}</span>
                  <span className="block px-3 pb-3 text-sm text-muted">{list.open_count} to do</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
