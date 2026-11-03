import { after, NextResponse } from "next/server";
import { processReel } from "@/lib/pipeline/process";
import { UPLOAD_BUCKET, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

async function ownedReel(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Row-level security limits this to the signed-in person's Reels.
  const { data } = await supabase
    .from("reels")
    .select("id, status, media_path, media_url, caption, note, source_url")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function POST(_request: Request, context: RouteContext<"/api/reels/[id]">) {
  const { id } = await context.params;
  const reel = await ownedReel(id);
  if (!reel) return NextResponse.json({ error: "Reel not found." }, { status: 404 });
  if (reel.status !== "failed") return NextResponse.json({ error: "This Reel isn’t waiting for a retry." }, { status: 409 });
  // Shared Reels can be retried from their caption, note or page link alone.
  if (!reel.media_path && !reel.media_url && !reel.caption?.trim() && !reel.note?.trim() && !reel.source_url) {
    return NextResponse.json({ error: "The video is gone. Please send it again." }, { status: 410 });
  }

  const { error } = await createAdminClient()
    .from("reels")
    .update({ status: "received", error: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "failed");
  if (error) return NextResponse.json({ error: "Retry didn’t start. Please try again." }, { status: 500 });

  after(() => processReel(id));
  return NextResponse.json({ id }, { status: 202 });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/reels/[id]">) {
  const { id } = await context.params;
  const reel = await ownedReel(id);
  if (!reel) return NextResponse.json({ error: "Reel not found." }, { status: 404 });

  const admin = createAdminClient();
  if (reel.media_path) {
    const { error } = await admin.storage.from(UPLOAD_BUCKET).remove([reel.media_path]);
    if (error) return NextResponse.json({ error: "The video couldn’t be deleted." }, { status: 500 });
  }
  const { error } = await admin.from("reels").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "That didn’t delete. Please try again." }, { status: 500 });
  return NextResponse.json({ id });
}
