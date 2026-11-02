"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Item, ListWithCount, Reel } from "@/lib/types";
import { HomeShelf } from "./HomeShelf";
import { Icon } from "./Icon";
import { TaskRow } from "./TaskRow";
import { UploadReel } from "./UploadReel";
import { Tick } from "./Tick";
import { EmptyState, buttonClass } from "./ui";

const TODAY_TARGET = 3;
const LATER_LIMIT = 5;
const subscribe = () => () => {};

function metaFor(item: Item) {
  const parts = [item.lists?.name ?? "Unsorted"];
  if (item.due_at) {
    parts.push(`due ${new Date(item.due_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`);
  }
  return parts.join(" · ");
}

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const REEL_STATUS: Record<Reel["status"], string> = {
  received: "Reel received",
  watching: "Watching your Reel…",
  done: "Reel sorted",
  failed: "This Reel failed",
};

export function HomeBoard({
  items,
  reels,
  name,
  connected,
  chatUrl,
  lists,
  covers,
}: {
  items: Item[];
  reels: Reel[];
  name: string | null;
  connected: boolean;
  chatUrl: string | null;
  lists: ListWithCount[];
  covers: Record<string, string>;
}) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  if (!ready) return <div className="min-h-[60vh]" />;

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const open = items.filter((i) => i.status === "todo");
  const dueNow = open.filter((i) => i.due_at && new Date(i.due_at) <= endOfDay);
  const undated = open.filter((i) => !i.due_at);
  const filler = undated.slice(0, Math.max(0, TODAY_TARGET - dueNow.length));
  const fillerIds = new Set(filler.map((i) => i.id));
  const doneToday = items.filter((i) => i.done_at && new Date(i.done_at) >= startOfDay);
  const today = [...dueNow, ...filler, ...doneToday];
  const todayIds = new Set(today.map((i) => i.id));
  const later = open.filter((i) => !todayIds.has(i.id) && !fillerIds.has(i.id));
  const shownLater = later.slice(0, LATER_LIMIT);
  const remaining = dueNow.length + filler.length;

  const firstName = name?.split(" ")[0];
  const reelsToday = reels.filter((r) => new Date(r.created_at) >= startOfDay).length;
  const active = reels.find((r) => r.status === "received" || r.status === "watching");
  const speech = active
    ? "I’m on it!"
    : reelsToday
      ? `You sent ${reelsToday} ${reelsToday === 1 ? "Reel" : "Reels"} today.`
      : "Send me a Reel!";

  return (
    <div className="flex justify-between gap-14">
      <div className="w-full max-w-[680px]">
        <p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1 font-serif text-4xl sm:text-5xl">
          {greeting(now.getHours())}{firstName ? `, ${firstName}` : ""}.
        </h1>
        {items.length > 0 && (
          <p className="mt-1 text-xl text-muted">
            {remaining === 0 ? "Nothing left for today." : `${remaining} ${remaining === 1 ? "thing" : "things"} for today. No rush.`}
          </p>
        )}

        {!connected && (
          <Link href="/connect" className="mt-5 flex min-h-11 items-center gap-3 rounded-[10px] bg-t-yellow px-4 py-3 font-medium">
            <Icon name="instagram" /> Connect Instagram to start sending Reels <Icon name="arrow" size={18} className="ml-auto" />
          </Link>
        )}

        <div className="mt-5 xl:hidden"><UploadReel /></div>

        <div className="mt-6">
          {items.length === 0 ? (
            <EmptyState title="Your list is empty">
              <p>Send your first Reel to Tick, or upload a video, and it will appear here.</p>
              {connected && chatUrl && (
                <a href={chatUrl} target="_blank" rel="noreferrer" className={buttonClass()}>
                  <Icon name="instagram" /> Send your first Reel
                </a>
              )}
            </EmptyState>
          ) : (
            <section data-surface className="paper paper-margin px-2 pb-7 pt-6 [--paper-pad:8px] sm:px-5 sm:[--paper-pad:20px]">
              <span className="ribbon" aria-hidden />
              <h2 className="pb-2 pl-[68px] font-serif text-[32px]">Today</h2>
              {today.length > 0 ? (
                <ul>{today.map((item) => <TaskRow key={item.id} item={item} meta={metaFor(item)} />)}</ul>
              ) : (
                <p className="pb-4 pl-[68px] text-muted">Nothing for today.</p>
              )}
              {shownLater.length > 0 && (
                <>
                  <h2 className="pb-2 pl-[68px] pt-6 font-serif text-[32px]">Later</h2>
                  <ul>{shownLater.map((item) => <TaskRow key={item.id} item={item} meta={metaFor(item)} />)}</ul>
                </>
              )}
              {later.length > LATER_LIMIT && (
                <p className="pl-[68px] pt-3 text-sm text-muted">{later.length - LATER_LIMIT} more in your lists.</p>
              )}
            </section>
          )}
        </div>

        <HomeShelf items={items} lists={lists} covers={covers} />
      </div>

      <aside className="hidden w-[300px] shrink-0 flex-col gap-5 xl:flex">
        <div className="flex flex-col items-center">
          <p className="rounded-[14px] bg-t-yellow px-5 py-3 text-center font-hand text-[26px] font-bold">{speech}</p>
          <Tick mood={active ? "watching" : "waving"} size={160} />
        </div>
        <UploadReel />
        {reels[0] && (
          <div data-surface className="rounded-[14px] border border-edge bg-card px-5 py-4">
            <p className="eyebrow">Latest Reel</p>
            <p className="mt-2 font-medium">{REEL_STATUS[reels[0].status]}</p>
            {reels[0].caption && <p className="truncate text-sm text-muted">{reels[0].caption}</p>}
            {reels[0].status === "failed" && (
              <Link href="/app/review" className="text-sm underline">See what happened</Link>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
