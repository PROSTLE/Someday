import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { UserFacingError, pipelineConfig } from "@/lib/pipeline/config";
import { MAX_VIDEO_BYTES } from "@/lib/pipeline/media";
import { assertBudget, assertDailyLimit } from "@/lib/pipeline/usage";
import { UPLOAD_BUCKET, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Please sign in again.", 401);

  const { size, type } = (await request.json()) as { size?: number; type?: string };
  if (type !== "video/mp4") return fail("Please choose an MP4 video.", 400);
  if (!size || size > MAX_VIDEO_BYTES) return fail("That video is too large. The limit is 50 MB.", 400);

  const admin = createAdminClient();
  try {
    const config = pipelineConfig();
    await assertBudget(config, admin);
    await assertDailyLimit(admin, user.id, "reels", config.maxReelsPerDay);
  } catch (error) {
    if (error instanceof UserFacingError) return fail(error.message, 429);
    console.error("Upload check failed:", error instanceof Error ? error.message : error);
    return fail("Uploads aren’t available right now.", 500);
  }

  const path = `${user.id}/${randomUUID()}.mp4`;
  const { data, error } = await admin.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error) {
    console.error("Signed upload failed:", error.message);
    return fail("Uploads aren’t available right now.", 500);
  }
  return NextResponse.json({ path, token: data.token });
}
