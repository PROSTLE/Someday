import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UPLOAD_BUCKET } from "@/lib/supabase/admin";
import { UserFacingError } from "./config";

export const MAX_VIDEO_BYTES = 50_000_000;

const INSTAGRAM_MEDIA_HOST = /(^|\.)(fbsbx\.com|fbcdn\.net|cdninstagram\.com)$/;

export function isInstagramMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && INSTAGRAM_MEDIA_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

/** A public instagram.com page, kept only as the item's source link. It is never downloaded. */
export function isInstagramPageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)instagram\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** What Instagram sent: a Reel's video, or the picture from a shared photo post. */
export type Media = { kind: "video"; blob: Blob } | { kind: "image"; dataUrl: string };

const IMAGE_TYPES: [string, (bytes: Uint8Array) => boolean][] = [
  ["image/jpeg", (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ["image/png", (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  ["image/webp", (b) => new TextDecoder("latin1").decode(b.subarray(8, 12)) === "WEBP"],
];

function toMedia(bytes: Buffer): Media {
  const image = IMAGE_TYPES.find(([, matches]) => matches(bytes));
  if (image) return { kind: "image", dataUrl: `data:${image[0]};base64,${bytes.toString("base64")}` };

  const text = new TextDecoder("latin1").decode(bytes.subarray(4, 12));
  if (!text.startsWith("ftyp")) {
    throw new UserFacingError("That file isn’t a video Tick can read. Please send an MP4.");
  }
  if (text.slice(4) === "qt  ") {
    throw new UserFacingError("That’s a MOV file. Please send an MP4.");
  }
  return { kind: "video", blob: new Blob([new Uint8Array(bytes)], { type: "video/mp4" }) };
}

async function readLimited(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_VIDEO_BYTES) throw new UserFacingError("That video is too large. The limit is 50 MB.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Video response had no body");

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_VIDEO_BYTES) {
      await reader.cancel();
      throw new UserFacingError("That video is too large. The limit is 50 MB.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function loadMedia(
  admin: SupabaseClient,
  reel: { media_path: string | null; media_url: string | null },
  signal: AbortSignal,
): Promise<Media> {
  let bytes: Buffer;

  if (reel.media_path) {
    const { data, error } = await admin.storage.from(UPLOAD_BUCKET).download(reel.media_path);
    if (error || !data) throw new UserFacingError("That upload is no longer available. Please send it again.");
    bytes = Buffer.from(await data.arrayBuffer());
  } else if (reel.media_url) {
    if (!isInstagramMediaUrl(reel.media_url)) throw new Error("Refused to download from an unknown host");
    const response = await fetch(reel.media_url, { signal, redirect: "follow" });
    if (!isInstagramMediaUrl(response.url)) throw new Error("Refused a redirect to an unknown host");
    if (!response.ok) {
      throw new UserFacingError("Instagram didn’t give Tick this video. Add a note saying what it’s about and send it again.");
    }
    bytes = await readLimited(response);
  } else {
    throw new UserFacingError("Tick didn’t receive a video. Add a note saying what it’s about and send it again.");
  }

  if (bytes.length > MAX_VIDEO_BYTES) throw new UserFacingError("That video is too large. The limit is 50 MB.");
  return toMedia(bytes);
}
