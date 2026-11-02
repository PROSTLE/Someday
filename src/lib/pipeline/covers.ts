import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COVER_BUCKET } from "@/lib/supabase/admin";
import type { PipelineConfig } from "./config";
import { assertBudget, recordCost } from "./usage";

export const coverPath = (userId: string, listId: string) => `${userId}/${listId}.jpeg`;

export async function coverUrls(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.storage.from(COVER_BUCKET).list(userId);
  if (error) throw new Error(`Cover list failed: ${error.message}`);
  const urls: Record<string, string> = {};
  for (const file of data ?? []) {
    const listId = file.name.replace(/\.jpeg$/, "");
    urls[listId] = admin.storage.from(COVER_BUCKET).getPublicUrl(`${userId}/${file.name}`).data.publicUrl;
  }
  return urls;
}

export const itemImagePath = (userId: string, itemId: string) => `${userId}/item-${itemId}.jpeg`;

async function generateImage(config: PipelineConfig, prompt: string, size: string, signal: AbortSignal) {
  const response = await fetch(`${config.apiBase}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.modelImage, prompt, size, response_format: "b64_json", output_format: "jpeg" }),
    signal,
  });
  if (!response.ok) throw new Error(`Image generation failed with HTTP ${response.status}`);
  const { data } = (await response.json()) as { data?: { b64_json?: string }[] };
  const encoded = data?.[0]?.b64_json;
  if (!encoded) throw new Error("Image generation returned no image");
  return Buffer.from(encoded, "base64");
}

/** An illustration for a saved dish. It is labelled as AI in the app, never shown as a photo of the real food. */
export async function createFoodImage(
  config: PipelineConfig,
  admin: SupabaseClient,
  item: { userId: string; itemId: string; title: string; reelId: string },
  signal: AbortSignal,
) {
  await assertBudget(config, admin);
  const image = await generateImage(
    config,
    `A warm, appetising flat vector illustration of this dish: ${JSON.stringify(item.title)}. Soft pastel background. No text, letters, logos or people.`,
    "1024x1024",
    signal,
  );
  await recordCost(admin, { userId: item.userId, reelId: item.reelId, kind: "search", model: config.modelImage, costUsd: config.priceImage });
  const path = itemImagePath(item.userId, item.itemId);
  const { error } = await admin.storage.from(COVER_BUCKET).upload(path, image, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return admin.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Covers are decoration, so a failure here never affects the Reel. */
export async function createListCover(
  config: PipelineConfig,
  admin: SupabaseClient,
  list: { userId: string; listId: string; name: string; reelId: string },
  signal: AbortSignal,
) {
  await assertBudget(config, admin);
  const image = await generateImage(
    config,
    `A cheerful flat vector illustration for a personal collection about ${JSON.stringify(list.name)}. Soft pastel mint, yellow, sky blue and coral colours. Simple rounded shapes. No text, letters, logos or people.`,
    "1792x1024",
    signal,
  );

  await recordCost(admin, {
    userId: list.userId,
    reelId: list.reelId,
    kind: "search",
    model: config.modelImage,
    costUsd: config.priceImage,
  });

  const { error } = await admin.storage
    .from(COVER_BUCKET)
    .upload(coverPath(list.userId, list.listId), image, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`Cover upload failed: ${error.message}`);
}
