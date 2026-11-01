import { after, NextResponse } from "next/server";
import { processReel } from "@/lib/pipeline/process";
import { UPLOAD_BUCKET, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const MAX_NOTE_LENGTH = 500;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { path, note } = (await request.json()) as { path?: string; note?: string };
  // A person can only register files inside their own folder.
  if (typeof path !== "string" || !path.startsWith(`${user.id}/`) || path.includes("..")) {
    return NextResponse.json({ error: "That upload isn’t valid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const name = path.slice(user.id.length + 1);
  const { data: files, error: listError } = await admin.storage.from(UPLOAD_BUCKET).list(user.id, { search: name });
  if (listError || !files?.some((file) => file.name === name)) {
    return NextResponse.json({ error: "That upload didn’t finish. Please try again." }, { status: 400 });
  }

  const { data: reel, error } = await admin
    .from("reels")
    .insert({
      user_id: user.id,
      media_path: path,
      note: typeof note === "string" ? note.trim().slice(0, MAX_NOTE_LENGTH) || null : null,
      status: "received",
    })
    .select("id")
    .single();
  if (error) {
    console.error("Reel save failed:", error.message);
    return NextResponse.json({ error: "That didn’t save. Please try again." }, { status: 500 });
  }

  after(() => processReel(reel.id));
  return NextResponse.json({ id: reel.id }, { status: 202 });
}
