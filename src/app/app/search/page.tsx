import Link from "next/link";
import { Icon } from "@/components/Icon";
import { EmptyState, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";
import { ITEM_SELECT, type Item } from "@/lib/types";

export default async function Search(props: PageProps<"/app/search">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const { supabase } = await requireUser();

  let results: Item[] = [];
  if (query) {
    const { data, error } = await supabase
      .from("items")
      .select(ITEM_SELECT)
      .textSearch("search", query, { type: "websearch", config: "simple" })
      .limit(50);
    if (error) throw new Error(error.message);
    results = (data ?? []) as Item[];
  }

  return (
    <>
      <PageTitle title="Search" />
      <form data-surface className="mb-6 flex max-w-2xl items-center gap-2.5 rounded-[10px] border border-edge bg-card px-4">
        <Icon name="search" size={18} className="text-muted" />
        <input
          name="q"
          defaultValue={query}
          aria-label="Search everything you saved"
          placeholder="Search everything you saved"
          className="min-h-12 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </form>
      {query && results.length === 0 && (
        <EmptyState title="No matches" mood="watching"><p>Try a different word.</p></EmptyState>
      )}
      <ul className="flex max-w-2xl flex-col gap-2.5">
        {results.map((item) => (
          <li key={item.id} data-surface>
            <Link href={`/app/items/${item.id}`} className="block rounded-xl border border-edge bg-card px-4 py-3 hover:bg-tint">
              <span className="block font-medium">{item.title}</span>
              <span className="text-sm text-muted">{item.lists?.name ?? "Unsorted"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
