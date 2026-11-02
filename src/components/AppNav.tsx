"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ListWithCount } from "@/lib/types";
import { Icon, VIEW_ICONS } from "./Icon";

function NavItem({
  href,
  icon,
  label,
  count,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 ${active ? "bg-t-mint font-semibold" : "hover:bg-tint"}`}
    >
      <Icon name={icon} size={20} />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-sm font-normal tabular-nums text-muted">{count}</span>}
    </Link>
  );
}

export function SideNav({
  lists,
  todoCount,
  reviewCount,
}: {
  lists: ListWithCount[];
  todoCount: number;
  reviewCount: number;
}) {
  const path = usePathname();
  return (
    <nav aria-label="Your lists" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
      <p className="eyebrow mb-2 px-3">Your lists</p>
      <NavItem href="/app" icon="list" label="To-do" count={todoCount} active={path === "/app"} />
      {lists.map((list) => (
        <NavItem
          key={list.id}
          href={`/app/lists/${list.slug}`}
          icon={VIEW_ICONS[list.view]}
          label={list.name}
          count={list.open_count}
          active={path === `/app/lists/${list.slug}`}
        />
      ))}
      <div className="mx-3 my-3 border-t border-edge" />
      <NavItem href="/app/review" icon="inbox" label="Needs a look" count={reviewCount} active={path === "/app/review"} />
      <NavItem href="/app/plan" icon="calendar" label="Plan with Tick" active={path === "/app/plan"} />
      <NavItem href="/app/ask" icon="idea" label="Ask Tick" active={path === "/app/ask"} />
      <NavItem href="/app/wrapped" icon="grid" label="Your Wrapped" active={path === "/app/wrapped"} />
      <NavItem href="/app/lists" icon="plus" label="All lists" active={path === "/app/lists"} />
      <NavItem href="/app/settings" icon="settings" label="Settings" active={path === "/app/settings"} />
    </nav>
  );
}

export function BottomTabs({ chatUrl, reviewCount }: { chatUrl: string | null; reviewCount: number }) {
  const path = usePathname();
  const tab = (href: string, icon: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 flex-1 flex-col items-center justify-center text-sm ${active ? "font-semibold text-ink" : "text-muted"}`}
    >
      <Icon name={icon} size={22} />
      {label}
    </Link>
  );

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 flex items-center border-t border-edge bg-card px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 lg:hidden">
      {tab("/app", "list", "To-do", path === "/app")}
      {tab("/app/lists", "book", "Lists", path.startsWith("/app/lists"))}
      {chatUrl && (
        <a
          href={chatUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Send a Reel"
          className="mx-1 inline-flex size-12 items-center justify-center rounded-full bg-primary text-on-primary"
        >
          <Icon name="plus" />
        </a>
      )}
      {tab("/app/search", "search", "Search", path === "/app/search")}
      {tab("/app/review", "inbox", reviewCount ? `Review ${reviewCount}` : "Review", path === "/app/review")}
    </nav>
  );
}
