import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UserFacingError, type PipelineConfig } from "./config";
import { ModelIncompleteError, costOf, type ModelUsage } from "./meta";

export async function assertBudget(config: PipelineConfig, admin: SupabaseClient) {
  const { data, error } = await admin.rpc("ai_spent_usd");
  if (error) throw new Error(`Budget check failed: ${error.message}`);
  if (Number(data) >= config.budgetUsd) {
    throw new UserFacingError("Tick has reached its AI budget, so new Reels are paused.");
  }
}

export async function recordUsage(
  config: PipelineConfig,
  admin: SupabaseClient,
  entry: { userId: string; reelId: string | null; kind: "extract" | "search" | "ask"; usage: ModelUsage },
) {
  const { usage } = entry;
  const { error } = await admin.from("ai_usage").insert({
    user_id: entry.userId,
    reel_id: entry.reelId,
    kind: entry.kind,
    model: usage.model,
    input_tokens: usage.inputTokens,
    cached_tokens: usage.cachedTokens,
    output_tokens: usage.outputTokens,
    search_queries: usage.searchQueries,
    cost_usd: costOf(config, usage),
  });
  // Unrecorded spending would weaken the budget stop, so this must not pass silently.
  if (error) throw new Error(`Usage record failed: ${error.message}`);
}

/** Unfinished responses are billed too, so their usage must still be counted. */
export async function recordFailedUsage(
  config: PipelineConfig,
  admin: SupabaseClient,
  error: unknown,
  entry: { userId: string; reelId: string | null; kind: "extract" | "search" | "ask" },
) {
  if (error instanceof ModelIncompleteError) {
    await recordUsage(config, admin, { ...entry, usage: error.usage });
  }
}

/** Records a flat per-call price, such as one generated image. */
export async function recordCost(
  admin: SupabaseClient,
  entry: { userId: string; reelId: string | null; kind: "extract" | "search" | "ask"; model: string; costUsd: number },
) {
  const { error } = await admin.from("ai_usage").insert({
    user_id: entry.userId,
    reel_id: entry.reelId,
    kind: entry.kind,
    model: entry.model,
    input_tokens: 0,
    cached_tokens: 0,
    output_tokens: 0,
    search_queries: 0,
    cost_usd: entry.costUsd,
  });
  if (error) throw new Error(`Usage record failed: ${error.message}`);
}

export async function assertDailyLimit(
  admin: SupabaseClient,
  userId: string,
  table: "reels" | "ai_usage",
  limit: number,
) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  let query = admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  if (table === "ai_usage") query = query.eq("kind", "ask");
  const { count, error } = await query;
  if (error) throw new Error(`Daily limit check failed: ${error.message}`);
  if ((count ?? 0) >= limit) throw new UserFacingError("You’ve reached today’s limit. Please try again tomorrow.");
}
