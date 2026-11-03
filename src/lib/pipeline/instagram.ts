import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const REPLY_LIMIT_BYTES = 1000;

export type InstagramAttachment = {
  type?: string;
  payload?: { url?: string; title?: string; reel_video_id?: string };
};

export type InstagramEvent = {
  sender?: { id?: string };
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: InstagramAttachment[];
    referral?: { ref?: string };
  };
  postback?: { referral?: { ref?: string } };
  referral?: { ref?: string };
};

/** Fails closed: without a secret, nothing is accepted. */
export function isValidSignature(rawBody: string, header: string | null, secret = process.env.INSTAGRAM_APP_SECRET) {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const received = Buffer.from(header.slice("sha256=".length));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function findVideo(attachments: InstagramAttachment[] = []) {
  return attachments.find((item) => ["ig_reel", "reel", "video", "share", "ig_post"].includes(item.type ?? ""));
}

const LINK_CODE_PATTERN = /\bSOME-[A-HJ-NP-Z2-9]{8}\b/;

/** Finds a link code in any place Instagram can deliver one. Other refs are ignored. */
export function findLinkCode(event: InstagramEvent) {
  const candidates = [event.referral?.ref, event.message?.referral?.ref, event.postback?.referral?.ref, event.message?.text];
  for (const value of candidates) {
    const code = value?.match(LINK_CODE_PATTERN)?.[0];
    if (code) return code;
  }
  return null;
}

function truncateToBytes(text: string, limit: number) {
  const encoder = new TextEncoder();
  let result = text;
  while (encoder.encode(result).length > limit) result = result.slice(0, -1);
  return result;
}

/**
 * A shared Reel arrives as a link to its public page plus a `reel_video_id`, not a video file.
 * This asks Meta's Graph API for that media's video URL. Meta may refuse for Reels the bot
 * doesn't own; the reason is logged and the caller falls back to the caption.
 */
export async function lookupReelVideo(reelVideoId: string) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token || !/^\d+$/.test(reelVideoId)) return null;
  const version = process.env.INSTAGRAM_API_VERSION;
  const url = `https://graph.facebook.com/${version ? `${version}/` : ""}${reelVideoId}?fields=media_url,media_type`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = (await response.json().catch(() => null)) as { media_url?: string; error?: { message?: string } } | null;
    if (response.ok && body?.media_url) return body.media_url;
    console.error(`Reel video lookup refused (HTTP ${response.status}):`, body?.error?.message ?? "no media_url");
  } catch (error) {
    console.error("Reel video lookup failed:", error instanceof Error ? error.message : error);
  }
  return null;
}

/**
 * Instagram API with Unified Login: the token is a business system-user token, so calls go to
 * graph.facebook.com with the bot's Instagram account ID. `/me` would be the system user, not the bot.
 */
export async function sendInstagramMessage(recipientId: string, text: string) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  if (!token || !accountId) {
    console.error("Instagram reply skipped: INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCOUNT_ID is not set");
    return;
  }
  const version = process.env.INSTAGRAM_API_VERSION;
  const url = `https://graph.facebook.com/${version ? `${version}/` : ""}${accountId}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: truncateToBytes(text, REPLY_LIMIT_BYTES) } }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`Instagram reply failed with HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }
  } catch (error) {
    console.error("Instagram reply failed:", error instanceof Error ? error.message : error);
  }
}
