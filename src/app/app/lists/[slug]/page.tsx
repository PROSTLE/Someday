import { notFound } from "next/navigation";
import { ListSettings } from "@/components/ListSettings";
import { RemoteImage } from "@/components/RemoteImage";
import { EmptyState, PageTitle } from "@/components/ui";
import { ListView } from "@/components/views/ListView";
import { coverUrls } from "@/lib/pipeline/covers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { ITEM_SELECT, type Item, type List } from "@/lib/types";

export default async function ListPage(props: PageProps<"/app/lists/[slug]">) {
  const { slug: encodedSlug } = await props.params;
  // Names like "Cafés" arrive URL-encoded, while the database stores the real text.
  const slug = decodeURIComponent(encodedSlug);
  const { supabase, user } = await requireUser();

  const { data: list, error } = await supabase.from("lists").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!list) notFound();

  const { data, error: itemsError } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("list_id", list.id)
    .eq("needs_review", false)
    .order("status", { ascending: false })
    .order("created_at", { ascending: false });
  if (itemsError) throw new Error(itemsError.message);

  const items = (data ?? []) as Item[];
  const open = items.filter((item) => item.status === "todo").length;
  const cover = (await coverUrls(createAdminClient(), user.id))[list.id];

  return (
    <>
      {cover && <RemoteImage src={cover} alt="" className="mb-6 h-40 w-full rounded-[14px] object-cover sm:h-52" />}
      <PageTitle title={list.name} sub={`${open} still to do`} />
      {items.length === 0 ? (
        <EmptyState title="Nothing here yet">
          <p>Items appear here when Tick finds something that belongs in this list.</p>
        </EmptyState>
      ) : (
        <ListView list={list as List} items={items} />
      )}
      <ListSettings id={list.id} name={list.name} />
    </>
  );
}
