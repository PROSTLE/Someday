import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { itemChips, itemVisual, quickAction } from "@/lib/quick";
import { ITEM_SELECT, type Item } from "@/lib/types";
import { sendInstagramCards, sendInstagramMessage, type Card, type CardButton } from "./instagram";

/** A postback button sends this back, so the item can be ticked off without leaving Instagram. */
export const DONE_PREFIX = "done:";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Items saved at least a day ago can come back as a reminder. */
const NUDGE_AFTER_MS = 86_400_000;
/** Each reminder waits this long before the same item can come back again. */
const NUDGE_COOLDOWN_MS = 7 * 86_400_000;
const NUDGE_POOL = 300;

/**
 * Links in Instagram must open on a phone, so only a public https address will do: the configured
 * site URL, else the production URL Vercel provides. Without one, cards leave the link out.
 */
function siteUrl() {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  if (configured.startsWith("https://")) return configured;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "";
}
const isHttps = (url: string | null | undefined): url is string => Boolean(url && url.startsWith("https://"));

export function parseDonePayload(payload: string | undefined) {
  const id = payload?.startsWith(DONE_PREFIX) ? payload.slice(DONE_PREFIX.length) : null;
  return id && UUID.test(id) ? id : null;
}

function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days >= 60) return `${Math.floor(days / 30)} months ago`;
  if (days >= 14) return `${Math.floor(days / 7)} weeks ago`;
  return days <= 1 ? "yesterday" : `${days} days ago`;
}

/**
 * One card per item: its picture, the single best action (stream, solve, directions…),
 * a link to its page in Someday, and a Done button that works inside Instagram.
 */
export function itemCard(item: Item, subtitle?: string): Card {
  const site = siteUrl();
  const page = site ? `${site}/app/items/${item.id}` : null;
  const action = quickAction(item);
  const buttons: CardButton[] = [];
  if (action?.external && isHttps(action.href)) buttons.push({ type: "web_url", title: action.short, url: action.href });
  if (page) buttons.push({ type: "web_url", title: "Open in Someday", url: page });
  if (item.status === "todo") buttons.push({ type: "postback", title: "Done ✓", payload: `${DONE_PREFIX}${item.id}` });

  const visual = itemVisual(item);
  const details = subtitle ?? [item.lists?.name, ...itemChips(item)].filter(Boolean).join(" · ");
  return {
    title: item.title,
    ...(details ? { subtitle: details } : {}),
    ...(isHttps(visual) ? { image_url: visual } : {}),
    ...(page ? { default_url: page } : {}),
    buttons,
  };
}

/**
 * Picks one open item saved a while ago that has a one-tap action, so a reply can bring it back:
 * the answer to saves becoming a graveyard. Items not yet nudged come first, then the oldest.
 */
export async function pickNudge(admin: SupabaseClient, userId: string, skipIds: string[]) {
  const { data, error } = await admin
    .from("items")
    .select(ITEM_SELECT)
    .eq("user_id", userId)
    .eq("status", "todo")
    .eq("needs_review", false)
    .lt("created_at", new Date(Date.now() - NUDGE_AFTER_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(NUDGE_POOL);
  if (error) {
    console.error("Nudge read failed:", error.message);
    return null;
  }
  const now = Date.now();
  const candidates = ((data ?? []) as Item[]).filter((item) => {
    const nudged = (item.data as { nudged_at?: string }).nudged_at;
    return !skipIds.includes(item.id) && quickAction(item) && (!nudged || now - new Date(nudged).getTime() > NUDGE_COOLDOWN_MS);
  });
  const never = candidates.find((item) => !(item.data as { nudged_at?: string }).nudged_at);
  const pick = never ?? candidates[0];
  if (!pick) return null;

  await admin.from("items").update({ data: { ...pick.data, nudged_at: new Date(now).toISOString() } }).eq("id", pick.id);
  return pick;
}

/** A plain line first, because cards don't show on Instagram's desktop site, then the cards. */
export async function replyWithItems(recipientId: string, text: string, items: Item[], nudge: Item | null = null) {
  await sendInstagramMessage(recipientId, text);
  const cards = items.map((item) => itemCard(item));
  if (nudge) cards.push(itemCard(nudge, `Saved ${ago(nudge.created_at)} · still on your list`));
  if (cards.length) await sendInstagramCards(recipientId, cards);
}

/** Marks an item done from a DM button, only if it belongs to the person who tapped it. */
export async function markDoneFromDm(admin: SupabaseClient, userId: string, itemId: string) {
  const { data, error } = await admin
    .from("items")
    .update({ status: "done", done_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("user_id", userId)
    .select("title")
    .maybeSingle();
  if (error) throw new Error(`Done update failed: ${error.message}`);
  return (data?.title as string | undefined) ?? null;
}
