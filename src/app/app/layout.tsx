import Link from "next/link";
import { BottomTabs, SideNav } from "@/components/AppNav";
import { Icon } from "@/components/Icon";
import { LiveRefresh } from "@/components/LiveRefresh";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo, SetupNotice, buttonClass } from "@/components/ui";
import { instagramChatUrl, isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";
import type { ListWithCount } from "@/lib/types";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { supabase, user } = await requireUser();

  const [lists, open, failed, profile] = await Promise.all([
    supabase.from("lists").select("*").order("created_at"),
    supabase.from("items").select("list_id, needs_review").eq("status", "todo"),
    supabase.from("reels").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  const firstError = lists.error ?? open.error ?? failed.error ?? profile.error;
  if (firstError) throw new Error(firstError.message);

  const rows = open.data ?? [];
  const listCounts: ListWithCount[] = (lists.data ?? []).map((list) => ({
    ...list,
    open_count: rows.filter((row) => row.list_id === list.id && !row.needs_review).length,
  }));
  const todoCount = rows.filter((row) => !row.needs_review).length;
  const reviewCount = rows.filter((row) => row.needs_review).length + (failed.count ?? 0);
  const name: string = profile.data?.display_name ?? user.email ?? "?";
  const initials = name.slice(0, 2).toUpperCase();
  const chatUrl = instagramChatUrl();

  return (
    <div className="flex min-h-dvh flex-col lg:pl-64">
      <LiveRefresh userId={user.id} />
      <aside
        data-sidebar
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-edge bg-card lg:flex"
      >
        <div data-sidebar-brand className="flex h-[73px] shrink-0 items-center border-b border-edge px-[22px]">
          <Logo href="/app" />
        </div>
        <SideNav lists={listCounts} todoCount={todoCount} reviewCount={reviewCount} />
      </aside>

      <header className="sticky top-0 z-20 border-b border-edge bg-card">
        {/* Full width, so the actions sit at the window's right edge rather than the content column's. */}
        <div className="flex h-[72px] w-full items-center gap-3 px-4 lg:px-8">
          <span className="lg:hidden">
            <Logo href="/app" />
          </span>
          <form action="/app/search" className="hidden w-[380px] items-center gap-2.5 rounded-[10px] border border-edge bg-page px-4 lg:flex">
            <Icon name="search" size={18} className="text-muted" />
            <input
              name="q"
              aria-label="Search everything you saved"
              placeholder="Search everything you saved"
              className="min-h-11 flex-1 bg-transparent outline-none placeholder:text-muted"
            />
          </form>
          <div className="flex-1" />
          {chatUrl && (
            <span className="hidden sm:block">
              <a href={chatUrl} target="_blank" rel="noreferrer" className={buttonClass()}>
                <Icon name="instagram" /> Send a Reel
              </a>
            </span>
          )}
          <ThemeToggle />
          <Link
            href="/app/settings"
            aria-label="Settings"
            className="inline-flex size-11 items-center justify-center rounded-full bg-t-mint font-semibold"
          >
            {initials}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-[1160px] flex-1 px-4 pb-28 pt-6 lg:px-10 lg:pb-10 lg:pt-10">
        {children}
      </main>
      <BottomTabs chatUrl={chatUrl} reviewCount={reviewCount} />
    </div>
  );
}
