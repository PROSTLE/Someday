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
  postback?: { referral?: { ref?: string }; payload?: string; title?: string };
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
 * Returns whether Instagram accepted the message.
 */
async function sendMessage(recipientId: string, message: Record<string, unknown>) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  if (!token || !accountId) {
    console.error("Instagram reply skipped: INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCOUNT_ID is not set");
    return false;
  }
  const version = process.env.INSTAGRAM_API_VERSION;
  const url = `https://graph.facebook.com/${version ? `${version}/` : ""}${accountId}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`Instagram reply failed with HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }
    return response.ok;
  } catch (error) {
    console.error("Instagram reply failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function sendInstagramMessage(recipientId: string, text: string) {
  return sendMessage(recipientId, { text: truncateToBytes(text, REPLY_LIMIT_BYTES) });
}

/** A card in Instagram's generic template. Instagram caps titles and subtitles at 80 characters. */
export type CardButton = { type: "web_url"; title: string; url: string } | { type: "postback"; title: string; payload: string };
export type Card = { title: string; subtitle?: string; image_url?: string; default_url?: string; buttons: CardButton[] };

const TEMPLATE_TEXT_LIMIT = 80;
const BUTTON_TITLE_LIMIT = 20;
const MAX_CARDS = 10;
const MAX_BUTTONS = 3;

const clip = (text: string, limit: number) => (text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text);

/**
 * Sends up to ten swipeable cards with buttons. Instagram doesn't show these on desktop,
 * so callers send a plain text line first.
 */
export async function sendInstagramCards(recipientId: string, cards: Card[]) {
  if (cards.length === 0) return true;
  const elements = cards.slice(0, MAX_CARDS).map((card) => ({
    title: clip(card.title, TEMPLATE_TEXT_LIMIT),
    ...(card.subtitle ? { subtitle: clip(card.subtitle, TEMPLATE_TEXT_LIMIT) } : {}),
    ...(card.image_url ? { image_url: card.image_url } : {}),
    ...(card.default_url ? { default_action: { type: "web_url", url: card.default_url } } : {}),
    buttons: card.buttons.slice(0, MAX_BUTTONS).map((button) => ({ ...button, title: clip(button.title, BUTTON_TITLE_LIMIT) })),
  }));
  return sendMessage(recipientId, { attachment: { type: "template", payload: { template_type: "generic", elements } } });
}
