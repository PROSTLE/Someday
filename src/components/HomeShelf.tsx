"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Item, ListWithCount } from "@/lib/types";
import { Icon } from "./Icon";
import { ListCover, toCoverItem } from "./ListCover";
import { ReadyShelf } from "./ReadyShelf";

const FORGOTTEN_AFTER_MS = 7 * 86_400_000;
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

      <ReadyShelf items={open} />

      {lists.length > 0 && (
        <section>
          <h2 className="font-serif text-[28px]">Your lists</h2>
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {lists.map((list, index) => {
              const inList = open.filter((item) => item.list_id === list.id);
              return (
                <li key={list.id} data-surface>
                  <Link
                    href={`/app/lists/${list.slug}`}
                    className="group block overflow-hidden rounded-[14px] border border-edge bg-card transition-shadow hover:shadow-lg focus-visible:shadow-lg"
                  >
                    <ListCover
                      view={list.view}
                      index={index}
                      fallback={covers[list.id]}
                      items={inList.map((item) =>
                        toCoverItem({ ...item, image: item.data.image_url ?? item.data.photos?.[0]?.url, lat: item.data.lat, lng: item.data.lng }),
                      )}
                    />
                    <span className="flex items-center gap-2 px-3 pt-2.5">
                      <span className="font-medium">{list.name}</span>
                      <Icon name="arrow" size={16} className="ml-auto -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                    </span>
                    <span className="block px-3 pb-3 text-sm text-muted">{list.open_count} to do</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
