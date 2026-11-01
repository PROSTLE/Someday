import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const REPLY_LIMIT_BYTES = 1000;

export type InstagramAttachment = { type?: string; payload?: { url?: string; title?: string } };

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

export async function sendInstagramMessage(recipientId: string, text: string) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.error("Instagram reply skipped: INSTAGRAM_ACCESS_TOKEN is not set");
    return;
  }
  const version = process.env.INSTAGRAM_API_VERSION;
  const url = `https://graph.instagram.com/${version ? `${version}/` : ""}me/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: truncateToBytes(text, REPLY_LIMIT_BYTES) } }),
    });
    if (!response.ok) console.error(`Instagram reply failed with HTTP ${response.status}`);
  } catch (error) {
    console.error("Instagram reply failed:", error instanceof Error ? error.message : error);
  }
}
