import { after, NextResponse } from "next/server";
import { pipelineConfig } from "@/lib/pipeline/config";
import {
  findLinkCode,
  findVideo,
  isValidSignature,
  lookupReelVideo,
  sendInstagramMessage,
  type InstagramEvent,
} from "@/lib/pipeline/instagram";
import { isInstagramMediaUrl, isInstagramPageUrl } from "@/lib/pipeline/media";
import { processReel } from "@/lib/pipeline/process";
import { assertDailyLimit } from "@/lib/pipeline/usage";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

const NO_CONTENT_ERROR =
  "Instagram didn’t share this Reel’s video and it has no caption, so Tick can’t tell what it’s about.";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const expected = process.env.INSTAGRAM_VERIFY_TOKEN;
  if (expected && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === expected) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

async function linkAccount(senderId: string, code: string) {
  const admin = createAdminClient();
  // Marking the code used in one step means it can only ever work once.
  const { data: link, error: claimError } = await admin
    .from("link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();
  if (claimError) throw new Error(`Link code claim failed: ${claimError.message}`);
  if (!link) {
    await sendInstagramMessage(senderId, "That code didn’t work. Open the Connect page to get a new one.");
    return;
  }

  const { error } = await admin.from("profiles").update({ instagram_id: senderId }).eq("id", link.user_id);
  if (error) {
    await sendInstagramMessage(senderId, "This Instagram account is already connected to another Someday account.");
    return;
  }
  await sendInstagramMessage(senderId, "You’re connected! Send me any Reel and I’ll sort it for you.");
}

async function handleEvent(event: InstagramEvent) {
  const senderId = event.sender?.id;
  const message = event.message;
  if (!senderId || message?.is_echo) return;

  const code = findLinkCode(event);
  if (code) return linkAccount(senderId, code);
  if (!message?.mid) return;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("instagram_id", senderId).maybeSingle();
  if (!profile) {
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    await sendInstagramMessage(senderId, `Hi! Connect your account first${site ? ` at ${site}` : ""}, then send me Reels.`);
    return;
  }

  const video = findVideo(message.attachments);
  if (!video) {
    await sendInstagramMessage(senderId, "Send me a Reel and I’ll sort it for you.");
    return;
  }

  try {
    await assertDailyLimit(admin, profile.id, "reels", pipelineConfig().maxReelsPerDay);
  } catch (error) {
    await sendInstagramMessage(senderId, error instanceof Error ? error.message : "Please try again later.");
    return;
  }

  // A shared Reel's `url` is its public instagram.com page, not a video file. Ask Meta's API for
  // the video by `reel_video_id`; if Meta refuses, Tick works from the caption and note instead.
  const link = video.payload?.url;
  let mediaUrl = link && isInstagramMediaUrl(link) ? link : null;
  if (!mediaUrl && video.payload?.reel_video_id) {
    const found = await lookupReelVideo(video.payload.reel_video_id);
    if (found && isInstagramMediaUrl(found)) mediaUrl = found;
  }
  const caption = video.payload?.title?.trim() || null;
  const note = message.text?.trim() || null;
  const pageLink = link && isInstagramPageUrl(link) ? link : null;
  // Even with no video or caption, the Reel's page link lets Tick research it.
  const usable = Boolean(mediaUrl || caption || note || pageLink);
  const { data: reel, error } = await admin
    .from("reels")
    .upsert(
      {
        user_id: profile.id,
        message_id: message.mid,
        source_url: pageLink,
        caption,
        note,
        media_url: mediaUrl,
        status: usable ? "received" : "failed",
        error: usable ? null : NO_CONTENT_ERROR,
      },
      { onConflict: "message_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Reel save failed: ${error.message}`);
  // No row means this message was already handled.
  if (reel && usable) await processReel(reel.id);
  if (reel && !usable) await sendInstagramMessage(senderId, NO_CONTENT_ERROR);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const payload = JSON.parse(rawBody) as { entry?: { messaging?: InstagramEvent[] }[] };
  const events = (payload.entry ?? []).flatMap((entry) => entry.messaging ?? []);

  // Meta batches messages sent close together, like several Reels forwarded at once. Each one
  // takes up to ~280 seconds, so they run side by side to all finish inside the 300-second limit.
  after(() =>
    Promise.all(
      events.map((event) =>
        handleEvent(event).catch((error) =>
          console.error("Webhook event failed:", error instanceof Error ? error.message : error),
        ),
      ),
    ),
  );
  return NextResponse.json({ received: true });
}
