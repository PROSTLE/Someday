import { after, NextResponse } from "next/server";
import { pipelineConfig } from "@/lib/pipeline/config";
import {
  findLinkCode,
  findVideo,
  isValidSignature,
  sendInstagramMessage,
  type InstagramEvent,
} from "@/lib/pipeline/instagram";
import { isInstagramMediaUrl } from "@/lib/pipeline/media";
import { processReel } from "@/lib/pipeline/process";
import { assertDailyLimit } from "@/lib/pipeline/usage";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

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

  const mediaUrl = video.payload?.url;
  const usable = mediaUrl && isInstagramMediaUrl(mediaUrl);
  const { data: reel, error } = await admin
    .from("reels")
    .upsert(
      {
        user_id: profile.id,
        message_id: message.mid,
        source_url: null,
        caption: video.payload?.title ?? null,
        note: message.text?.trim() || null,
        media_url: usable ? mediaUrl : null,
        status: usable ? "received" : "failed",
        error: usable ? null : "Instagram didn’t include the video. Try a screen recording of the Reel.",
      },
      { onConflict: "message_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Reel save failed: ${error.message}`);
  // No row means this message was already handled.
  if (reel && usable) await processReel(reel.id);
  if (reel && !usable) await sendInstagramMessage(senderId, "I couldn’t get that video. Try sending a screen recording.");
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const payload = JSON.parse(rawBody) as { entry?: { messaging?: InstagramEvent[] }[] };
  const events = (payload.entry ?? []).flatMap((entry) => entry.messaging ?? []);

  after(async () => {
    for (const event of events) {
      await handleEvent(event).catch((error) =>
        console.error("Webhook event failed:", error instanceof Error ? error.message : error),
      );
    }
  });
  return NextResponse.json({ received: true });
}
