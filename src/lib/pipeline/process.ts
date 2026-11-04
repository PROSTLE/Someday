import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COVER_BUCKET, UPLOAD_BUCKET, createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { ITEM_SELECT, VIEW_LABELS, type Item, type ItemData, type View } from "@/lib/types";
import { UserFacingError, pipelineConfig, type PipelineConfig } from "./config";
import { createFoodImage, createListCover } from "./covers";
import { baseData, enrichItem, type Enrichment, type ReelSummary } from "./enrich";
import { addResources } from "./resources";
import { extractItems, type ExtractedItem } from "./extract";
import { researchReel, type ReelResearch } from "./research";
import { pickNudge, replyWithItems } from "./dm";
import { sendInstagramMessage } from "./instagram";
import { loadMedia } from "./media";
import { deleteVideo, uploadVideo } from "./meta";
import { assertBudget, recordFailedUsage, recordUsage } from "./usage";

const HARD_LIMIT_MS = 280_000;
const ENRICH_LIMIT_MS = 200_000;
const STALE_AFTER_MS = 6 * 60_000;
const MAX_COVERS_PER_REEL = 4;
const MAX_FOOD_IMAGES_PER_REEL = 2;
const TRAILING_YEAR = /\s*[([]\s*(?:19|20)\d{2}\s*[)\]]\s*$/;
const GENERIC_ERROR ="Something went wrong while reading this Reel. Please retry.";

type ReelRow = {
  id: string;
  user_id: string;
  caption: string | null;
  note: string | null;
  media_path: string | null;
  media_url: string | null;
  message_id: string | null;
  source_url: string | null;
  attempts: number;
};

const BRIEF_SENTENCES = 2;
const BRIEF_CHARS = 360;

/**
 * Summaries are asked for in one or two sentences, but a model can occasionally run on for pages.
 * Keep the first two sentences, and never more than a short paragraph.
 */
export function brief(text: string | null | undefined) {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  // A sentence ends at . ! or ? followed by a space or the end, so "2.0" doesn't end one.
  let cut = clean.length;
  let count = 0;
  for (const end of clean.matchAll(/[.!?]+["”’)]*(?=\s|$)/g)) {
    if (++count === BRIEF_SENTENCES) {
      cut = end.index + end[0].length;
      break;
    }
  }
  let out = clean.slice(0, cut);
  if (out.length > BRIEF_CHARS) out = `${out.slice(0, BRIEF_CHARS - 1).replace(/\s+\S*$/, "")}…`;
  return out;
}

async function failStaleReels(admin: SupabaseClient) {
  await admin
    .from("reels")
    .update({ status: "failed", error: "This Reel took too long. Please retry.", updated_at: new Date().toISOString() })
    // A Reel left "received" was never picked up, for example when its run was cut off.
    .in("status", ["received", "watching"])
    .lt("updated_at", new Date(Date.now() - STALE_AFTER_MS).toISOString());
}

/** Only one run can move a Reel from received to watching. */
async function claimReel(admin: SupabaseClient, reelId: string) {
  const { data: current, error: readError } = await admin
    .from("reels")
    .select("attempts")
    .eq("id", reelId)
    .eq("status", "received")
    .maybeSingle();
  if (readError) throw new Error(`Reel read failed: ${readError.message}`);
  if (!current) return null;

  const { data, error } = await admin
    .from("reels")
    .update({ status: "watching", error: null, attempts: current.attempts + 1, updated_at: new Date().toISOString() })
    .eq("id", reelId)
    .eq("status", "received")
    .select("id, user_id, caption, note, media_path, media_url, message_id, source_url, attempts")
    .maybeSingle();
  if (error) throw new Error(`Reel claim failed: ${error.message}`);
  return data as ReelRow | null;
}

/** Finds or creates a list for each item. A list only ever holds one view. */
async function listIdsFor(admin: SupabaseClient, userId: string, items: ExtractedItem[]) {
  const { data, error } = await admin.from("lists").select("id, slug, view").eq("user_id", userId);
  if (error) throw new Error(`List read failed: ${error.message}`);
  const known = new Map((data ?? []).map((list) => [list.slug as string, list as { id: string; view: View }]));

  const ids: (string | null)[] = [];
  for (const item of items) {
    let name = item.list_name.trim().slice(0, 60);
    let slug = slugify(name);
    if (!slug) {
      ids.push(null);
      continue;
    }
    const clash = known.get(slug);
    if (clash && clash.view !== item.view) {
      name = `${name} · ${VIEW_LABELS[item.view]}`;
      slug = slugify(name);
    }
    let list = known.get(slug);
    if (!list) {
      const { data: created, error: insertError } = await admin
        .from("lists")
        .upsert({ user_id: userId, name, slug, view: item.view }, { onConflict: "user_id,slug" })
        .select("id, view")
        .single();
      if (insertError) throw new Error(`List create failed: ${insertError.message}`);
      list = created as { id: string; view: View };
      known.set(slug, list);
    }
    ids.push(list.id);
  }
  return ids;
}

async function enrichAll(
  config: PipelineConfig,
  admin: SupabaseClient,
  reel: ReelRow,
  items: ExtractedItem[],
  summary: ReelSummary,
  startedAt: number,
  signal: AbortSignal,
) {
  const results: Enrichment[] = [];
  let searches = 0;

  for (const item of items) {
    const needsSearch = ["place", "date", "product", "claim", "game"].includes(item.lookup);
    const inTime = Date.now() - startedAt < ENRICH_LIMIT_MS;
    let allowSearch = needsSearch && inTime && searches < config.maxSearchesPerReel;
    if (allowSearch) {
      try {
        await assertBudget(config, admin);
      } catch {
        allowSearch = false;
      }
    }

    let result: Enrichment;
    try {
      result = await enrichItem(config, admin, item, summary, allowSearch, signal);
    } catch (error) {
      // One failed lookup shouldn't lose the Reel. The item stays, flagged for a person.
      console.error(`Enrichment failed for reel ${reel.id}:`, error instanceof Error ? error.message : error);
      await recordFailedUsage(config, admin, error, { userId: reel.user_id, reelId: reel.id, kind: "search" });
      result = { data: baseData(item, summary), dueAt: null, needsReview: true, usages: [] };
    }
    // Extra help: lessons for skills, photos for places, the full kit for recipes.
    const roomToSearch = Date.now() - startedAt < ENRICH_LIMIT_MS && searches < config.maxSearchesPerReel;
    try {
      const extra = await addResources(config, item, result.data, roomToSearch, signal);
      const facts = [...(result.data.facts ?? []), ...(extra.data.facts ?? [])];
      result = {
        ...result,
        data: { ...result.data, ...extra.data, ...(facts.length ? { facts } : {}) },
        usages: [...result.usages, ...extra.usages],
      };
      if (extra.usages.length) searches += 1;
    } catch (error) {
      console.error(`Extra help failed for reel ${reel.id}:`, error instanceof Error ? error.message : error);
    }
    if (result.usages.some((usage) => usage.searchQueries > 0)) searches += 1;
    for (const usage of result.usages) {
      await recordUsage(config, admin, { userId: reel.user_id, reelId: reel.id, kind: "search", usage });
    }
    results.push(result);
  }
  return results;
}

async function addMissingCovers(
  config: PipelineConfig,
  admin: SupabaseClient,
  reel: ReelRow,
  listIds: (string | null)[],
  signal: AbortSignal,
) {
  try {
    const { data: existing } = await admin.storage.from(COVER_BUCKET).list(reel.user_id);
    const covered = new Set((existing ?? []).map((file) => file.name.replace(/\.jpeg$/, "")));
    const missing = [...new Set(listIds.filter((id): id is string => Boolean(id) && !covered.has(id as string)))];
    const { data: lists } = await admin.from("lists").select("id, name").in("id", missing.slice(0, MAX_COVERS_PER_REEL));
    await Promise.all(
      (lists ?? []).map((list) =>
        createListCover(config, admin, { userId: reel.user_id, listId: list.id, name: list.name, reelId: reel.id }, signal),
      ),
    );
  } catch (error) {
    console.error(`Cover failed for reel ${reel.id}:`, error instanceof Error ? error.message : error);
  }
}

async function addFoodImages(
  config: PipelineConfig,
  admin: SupabaseClient,
  reel: ReelRow,
  saved: { id: string; title: string; data: ItemData }[],
  signal: AbortSignal,
) {
  const dishes = saved.filter((item) => item.data.ingredients?.length && !item.data.image_url).slice(0, MAX_FOOD_IMAGES_PER_REEL);
  await Promise.all(
    dishes.map(async (dish) => {
      try {
        const url = await createFoodImage(config, admin, { userId: reel.user_id, itemId: dish.id, title: dish.title, reelId: reel.id }, signal);
        const data = { ...dish.data, image_url: url, image_is_ai: true };
        await admin.from("items").update({ data }).eq("id", dish.id);
        // Keep the in-memory copy current, so the Instagram reply shows the picture too.
        dish.data = data;
      } catch (error) {
        console.error(`Food image failed for ${dish.id}:`, error instanceof Error ? error.message : error);
      }
    }),
  );
}

async function run(config: PipelineConfig, admin: SupabaseClient, reel: ReelRow, signal: AbortSignal) {
  const startedAt = Date.now();
  await assertBudget(config, admin);

  const { data: lists, error: listError } = await admin.from("lists").select("name").eq("user_id", reel.user_id);
  if (listError) throw new Error(`List read failed: ${listError.message}`);

  // Shared Reels often arrive without a video, because Instagram sends only the caption and a page link.
  // A shared photo post arrives as its picture, which the model reads directly.
  let fileId: string | null = null;
  let image: string | null = null;
  if (reel.media_path || reel.media_url) {
    try {
      const media = await loadMedia(admin, reel, signal);
      if (media.kind === "image") image = media.dataUrl;
      else fileId = await uploadVideo(config, media.blob, signal);
    } catch (error) {
      // An unreadable file shouldn't lose a Reel that still has a caption, note or page to go on.
      const fallback = reel.caption?.trim() || reel.note?.trim() || reel.source_url;
      if (!fallback || signal.aborted) throw error;
      console.error(`Media unusable for reel ${reel.id}, using text instead:`, error instanceof Error ? error.message : error);
    }
  }

  // Without the video, research the Reel's public page and the things it mentions.
  let research: ReelResearch | null = null;
  if (!fileId && reel.source_url) {
    try {
      const found = await researchReel(config, { link: reel.source_url, caption: reel.caption, note: reel.note }, signal);
      await recordUsage(config, admin, { userId: reel.user_id, reelId: reel.id, kind: "search", usage: found.usage });
      research = found.research;
    } catch (error) {
      await recordFailedUsage(config, admin, error, { userId: reel.user_id, reelId: reel.id, kind: "search" });
      console.error(`Research failed for reel ${reel.id}:`, error instanceof Error ? error.message : error);
    }
  }
  if (!fileId && !image && !research && !reel.caption?.trim() && !reel.note?.trim()) {
    throw new UserFacingError("Tick couldn’t find out what this Reel is about. Try adding a note when you share it.");
  }

  // The note typed with a shared Reel can arrive a moment after it, so read it again now.
  const { data: latest } = await admin.from("reels").select("note").eq("id", reel.id).maybeSingle();
  const note = (latest?.note as string | null | undefined) ?? reel.note;

  let extracted: Awaited<ReturnType<typeof extractItems>>;
  try {
    extracted = await extractItems(
      config,
      { fileId, image, caption: reel.caption, note, listNames: (lists ?? []).map((list) => list.name), research },
      signal,
    );
  } catch (error) {
    await recordFailedUsage(config, admin, error, { userId: reel.user_id, reelId: reel.id, kind: "extract" });
    throw error;
  } finally {
    if (fileId) {
      const uploaded = fileId;
      await deleteVideo(config, uploaded).catch((error) => console.error(`Video delete failed for ${uploaded}:`, error));
    }
  }
  await recordUsage(config, admin, { userId: reel.user_id, reelId: reel.id, kind: "extract", usage: extracted.usage });

  const items = extracted.items.filter((item) => item.title.trim());
  if (items.length === 0) throw new UserFacingError("Tick couldn’t find anything to save in this Reel.");

  const summary: ReelSummary = {
    recap: brief(extracted.recap),
    commentSummary: brief(extracted.comment_summary),
    captionSummary: brief(extracted.caption_summary),
  };
  const enrichments = await enrichAll(config, admin, reel, items, summary, startedAt, signal);
  const listIds = await listIdsFor(admin, reel.user_id, items);

  const enrichedAt = new Date().toISOString();
  const { data: saved, error } = await admin.from("items").insert(
    items.map((item, index) => ({
      user_id: reel.user_id,
      reel_id: reel.id,
      list_id: listIds[index],
      // A film's year belongs in its details, not its name.
      title: item.lookup === "title" ? item.title.trim().replace(TRAILING_YEAR, "") : item.title.trim(),
      summary: item.summary?.trim() || null,
      evidence: `${item.evidence_source.replaceAll("_", " ")}: ${item.evidence}`,
      data: { ...enrichments[index].data, enriched_at: enrichedAt },
      due_at: enrichments[index].dueAt,
      needs_review: enrichments[index].needsReview,
    })),
  ).select(ITEM_SELECT);
  if (error) throw new Error(`Item save failed: ${error.message}`);
  await Promise.all([
    addMissingCovers(config, admin, reel, listIds, signal),
    addFoodImages(config, admin, reel, saved ?? [], signal),
  ]);
  return (saved ?? []) as Item[];
}

/** A Reel that spreads something false gets a plain warning in the reply, not just a card. */
function claimWarning(items: Item[]) {
  const flagged = items.map((item) => item.data.claim_check).find((check) => check?.verdict === "false" || check?.verdict === "misleading");
  if (!flagged) return "";
  const claim = flagged.claim.length > 120 ? `${flagged.claim.slice(0, 117)}…` : flagged.claim;
  return `

Heads up: “${claim}” looks ${flagged.verdict === "false" ? "false" : "misleading"}. ${flagged.explanation}`;
}

async function removeStoredVideo(admin: SupabaseClient, path: string | null) {
  if (!path) return;
  const { error } = await admin.storage.from(UPLOAD_BUCKET).remove([path]);
  if (error) console.error(`Stored video delete failed for ${path}:`, error.message);
}

async function instagramIdFor(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("profiles").select("instagram_id").eq("id", userId).maybeSingle();
  return (data?.instagram_id as string | undefined) ?? null;
}

export async function processReel(reelId: string) {
  const admin = createAdminClient();
  await failStaleReels(admin);
  const reel = await claimReel(admin, reelId);
  if (!reel) return;

  let reply: string;
  let saved: Item[] = [];
  try {
    const items = await run(pipelineConfig(), admin, reel, AbortSignal.timeout(HARD_LIMIT_MS));
    saved = items;
    const { error } = await admin
      .from("reels")
      .update({ status: "done", error: null, media_path: null, media_url: null, updated_at: new Date().toISOString() })
      .eq("id", reel.id);
    if (error) throw new Error(`Reel update failed: ${error.message}`);
    await removeStoredVideo(admin, reel.media_path);
    const ready = items.filter((item) => !item.needs_review);
    const unsure = items.length - ready.length;
    const count = `${ready.length} ${ready.length === 1 ? "thing" : "things"}`;
    reply = ready.length ? `Saved ${count} from your Reel ✓` : "Saved your Reel.";
    if (unsure) reply += ` ${unsure} ${unsure === 1 ? "needs" : "need"} a quick look in the app.`;
    reply += claimWarning(items);
  } catch (error) {
    console.error(`Reel ${reel.id} failed:`, error instanceof Error ? error.message : error);
    const message = error instanceof UserFacingError ? error.message : GENERIC_ERROR;
    await admin
      .from("reels")
      .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", reel.id);
    reply = message;
  }

  // Only Reels that came in by DM get a DM back. Web uploads have no message ID.
  const instagramId = reel.message_id ? await instagramIdFor(admin, reel.user_id) : null;
  if (!instagramId) return;
  if (saved.length === 0) {
    await sendInstagramMessage(instagramId, reply);
    return;
  }
  // Cards with one-tap actions, plus one older save brought back so it isn't forgotten.
  const ready = saved.filter((item) => !item.needs_review);
  const nudge = await pickNudge(admin, reel.user_id, saved.map((item) => item.id));
  await replyWithItems(instagramId, reply, ready.slice(0, 9), nudge);
}
