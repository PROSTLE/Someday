"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slug";
import { COVER_BUCKET, UPLOAD_BUCKET, createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { VIEWS, type ItemData, type View } from "@/lib/types";

const refresh = () => revalidatePath("/app", "layout");

function ensure(error: { message: string } | null) {
  if (error) throw new Error(error.message);
  refresh();
}

export async function setItemDone(id: string, done: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("items")
    .update({ status: done ? "done" : "todo", done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  ensure(error);
}

export async function updateItem(id: string, fields: { title: string; summary: string | null }) {
  const title = fields.title.trim();
  if (!title) throw new Error("A title is required.");
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("items")
    .update({ title, summary: fields.summary?.trim() || null })
    .eq("id", id);
  ensure(error);
}

export async function updateItemData(id: string, data: ItemData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("items").update({ data }).eq("id", id);
  ensure(error);
}

export async function moveItem(id: string, listId: string | null) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("items").update({ list_id: listId, needs_review: false }).eq("id", id);
  ensure(error);
}

export async function addPlanToToday(itemIds: string[]) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("items").update({ due_at: new Date().toISOString() }).in("id", itemIds);
  ensure(error);
}

export async function deleteItem(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await createAdminClient().storage.from(COVER_BUCKET).remove([`${user.id}/item-${id}.jpeg`]);
  refresh();
}

export async function createList(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const view = String(formData.get("view")) as View;
  const slug = slugify(name);
  if (!name || !slug || !VIEWS.includes(view)) throw new Error("Choose a name and a view.");
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("lists").insert({ user_id: user.id, name, slug, view });
  ensure(error);
  redirect(`/app/lists/${slug}`);
}

export async function renameList(id: string, name: string) {
  const clean = name.trim();
  const slug = slugify(clean);
  if (!clean || !slug) throw new Error("Choose a name.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("lists").update({ name: clean, slug }).eq("id", id);
  ensure(error);
  redirect(`/app/lists/${slug}`);
}

export async function deleteList(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await createAdminClient().storage.from(COVER_BUCKET).remove([`${user.id}/${id}.jpeg`]);
  refresh();
  redirect("/app/lists");
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteAccount() {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  for (const bucket of [UPLOAD_BUCKET, COVER_BUCKET]) {
    const storage = admin.storage.from(bucket);
    const { data: files, error: listError } = await storage.list(user.id);
    if (listError) throw new Error(listError.message);
    if (files?.length) {
      const { error: removeError } = await storage.remove(files.map((file) => `${user.id}/${file.name}`));
      if (removeError) throw new Error(removeError.message);
    }
  }
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  redirect("/");
}
