import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A share link names one list and carries a signature, so only links Someday made will open.
 * The key is SHARE_LINK_SECRET when set, otherwise one derived from the Supabase service key,
 * which never leaves the server. Changing the key turns off every existing link.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_LENGTH = 32;

function key() {
  const own = process.env.SHARE_LINK_SECRET;
  if (own) return own;
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Share links need SHARE_LINK_SECRET or SUPABASE_SERVICE_ROLE_KEY.");
  return createHmac("sha256", base).update("someday-share-links").digest("hex");
}

const sign = (listId: string) =>
  createHmac("sha256", key()).update(`list:${listId}`).digest("base64url").slice(0, SIGNATURE_LENGTH);

export function shareToken(listId: string) {
  return `${listId}.${sign(listId)}`;
}

/** Returns the list ID when the token is genuine, otherwise null. */
export function readShareToken(token: string) {
  const [listId, signature] = token.split(".");
  if (!listId || !signature || !UUID.test(listId)) return null;
  const expected = Buffer.from(sign(listId));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? listId : null;
}
