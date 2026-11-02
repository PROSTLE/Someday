import { CopyButton } from "@/components/CopyButton";
import { Tick } from "@/components/Tick";
import { EmptyState, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";

export default async function Wrapped() {
  const { supabase } = await requireUser();
  const [items, reels] = await Promise.all([
    supabase.from("items").select("status, lists(name)"),
    supabase.from("reels").select("id", { count: "exact", head: true }).eq("status", "done"),
  ]);
  const failure = items.error ?? reels.error;
  if (failure) throw new Error(failure.message);

  const rows = (items.data ?? []) as unknown as { status: string; lists: { name: string } | null }[];
  if (rows.length === 0) {
    return (
      <>
        <PageTitle title="Your Wrapped" />
        <EmptyState title="Nothing to wrap yet"><p>Send a few Reels and your numbers will appear here.</p></EmptyState>
      </>
    );
  }

  const done = rows.filter((row) => row.status === "done").length;
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.lists) counts.set(row.lists.name, (counts.get(row.lists.name) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const largest = top[0]?.[1] ?? 1;
  const share = `I turned ${reels.count ?? 0} saved Reels into ${rows.length} things to do with Someday, and finished ${done}.${top[0] ? ` Most saved: ${top[0][0]}.` : ""}`;
  const colours = ["bg-mint", "bg-sky", "bg-yellow", "bg-lavender", "bg-coral"];

  return (
    <div className="max-w-2xl">
      <PageTitle title="Your Wrapped" sub="Your real numbers, from your real saves." />
      <section data-surface className="paper overflow-hidden p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">You’ve turned</p>
            <p className="font-serif text-6xl">{reels.count ?? 0}</p>
            <p className="text-lg text-muted">Reels into</p>
            <p className="mt-2 font-serif text-6xl">{rows.length}</p>
            <p className="text-lg text-muted">things to do, and finished {done}.</p>
          </div>
          <Tick mood="happy" size={130} />
        </div>
        {top.length > 0 && (
          <ul className="mt-6 flex flex-col gap-2">
            {top.map(([name, count], index) => (
              <li key={name}>
                <div className="flex justify-between text-sm"><span>{name}</span><span className="text-muted">{count}</span></div>
                <div className={`mt-1 h-2.5 rounded-full ${colours[index % colours.length]}`} style={{ width: `${(count / largest) * 100}%` }} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border border-edge bg-card p-4">
        <p className="text-sm text-muted">{share}</p>
        <CopyButton value={share} label="Copy" />
      </div>
    </div>
  );
}
