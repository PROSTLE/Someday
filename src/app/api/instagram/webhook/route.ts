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
import { askSaved } from "@/lib/pipeline/ask";
import { UserFacingError } from "@/lib/pipeline/config";
import { markDoneFromDm, parseDonePayload, replyWithItems } from "@/lib/pipeline/dm";
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

/** A note typed alongside a shared Reel can arrive as its own message, a moment after the Reel. */
const NOTE_WINDOW_MS = 2 * 60_000;
const NOTE_RETRY_MS = 3_000;

async function attachNote(admin: ReturnType<typeof createAdminClient>, userId: string, text: string) {
  for (const wait of [0, NOTE_RETRY_MS]) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    const { data } = await admin
      .from("reels")
      .update({ note: text.slice(0, 500) })
      .eq("user_id", userId)
      .is("note", null)
      .not("message_id", "is", null)
      .gte("created_at", new Date(Date.now() - NOTE_WINDOW_MS).toISOString())
      .in("status", ["received", "watching"])
      .select("id");
    if (data?.length) return true;
  }
  return false;
}

/** A typed message is a question about their saves, unless it's the note for a Reel just shared. */
async function answerText(admin: ReturnType<typeof createAdminClient>, userId: string, senderId: string, text: string) {
  if (await attachNote(admin, userId, text)) return;
  try {
    const { answer, items } = await askSaved(admin, admin, userId, text, "dm");
    await replyWithItems(senderId, answer, items.slice(0, 5));
  } catch (error) {
    if (!(error instanceof UserFacingError)) console.error("DM ask failed:", error instanceof Error ? error.message : error);
    await sendInstagramMessage(
      senderId,
      error instanceof UserFacingError ? error.message : "Tick couldn’t answer that just now. Please try again.",
    );
  }
}

async function handlePostback(admin: ReturnType<typeof createAdminClient>, userId: string, senderId: string, payload?: string) {
  const itemId = parseDonePayload(payload);
  if (!itemId) return;
  const title = await markDoneFromDm(admin, userId, itemId);
  await sendInstagramMessage(senderId, title ? `Nice! Marked “${title}” as done ✓` : "Tick couldn’t find that item any more.");
}

async function handleEvent(event: InstagramEvent) {
  const senderId = event.sender?.id;
  const message = event.message;
  if (!senderId || message?.is_echo) return;

  const code = findLinkCode(event);
  if (code) return linkAccount(senderId, code);
  if (!message?.mid && !event.postback?.payload) return;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("instagram_id", senderId).maybeSingle();
  if (!profile) {
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    await sendInstagramMessage(senderId, `Hi! Connect your account first${site ? ` at ${site}` : ""}, then send me Reels.`);
    return;
  }

  if (event.postback?.payload) return handlePostback(admin, profile.id, senderId, event.postback.payload);
  if (!message?.mid) return;

  const video = findVideo(message.attachments);
  if (!video) {
    const text = message.text?.trim();
    if (text) return answerText(admin, profile.id, senderId, text);
    await sendInstagramMessage(senderId, "Send me a Reel and I’ll sort it for you, or ask me about your saves.");
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

/**
 * When a Reel and the text typed with it arrive in the same delivery, the text becomes the
 * Reel's note rather than a separate question.
 */
function pairNotes(events: InstagramEvent[]) {
  const merged = new Set<InstagramEvent>();
  for (const event of events) {
    const text = event.message?.text?.trim();
    if (!text || event.message?.attachments?.length || event.message?.is_echo || findLinkCode(event)) continue;
    const share = events.find(
      (other) =>
        other !== event &&
        other.sender?.id === event.sender?.id &&
        !other.message?.text?.trim() &&
        findVideo(other.message?.attachments),
    );
    if (share?.message) {
      share.message.text = text;
      merged.add(event);
    }
  }
  return events.filter((event) => !merged.has(event));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const payload = JSON.parse(rawBody) as { entry?: { messaging?: InstagramEvent[] }[] };
  const events = pairNotes((payload.entry ?? []).flatMap((entry) => entry.messaging ?? []));

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
