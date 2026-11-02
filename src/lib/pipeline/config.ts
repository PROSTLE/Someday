import "server-only";

export type PipelineConfig = {
  apiKey: string;
  apiBase: string;
  modelExtract: string;
  modelSearch: string;
  modelImage: string;
  priceImage: number;
  tmdbRegion: string;
  priceInput: number;
  priceCached: number;
  priceOutput: number;
  priceSearch: number;
  budgetUsd: number;
  maxReelsPerDay: number;
  maxAsksPerDay: number;
  maxSearchesPerReel: number;
  tmdbKey: string;
  nominatimUrl: string;
  siteUrl: string;
};

const STRING_KEYS = ["MODEL_API_KEY", "MODEL_API_BASE", "MODEL_EXTRACT", "MODEL_SEARCH", "MODEL_IMAGE", "TMDB_REGION"];
const NUMBER_KEYS = [
  "PRICE_INPUT_PER_MTOK",
  "PRICE_CACHED_INPUT_PER_MTOK",
  "PRICE_OUTPUT_PER_MTOK",
  "PRICE_SEARCH_PER_1K",
  "PRICE_IMAGE_USD",
  "AI_BUDGET_USD",
  "MAX_REELS_PER_USER_PER_DAY",
  "MAX_ASKS_PER_USER_PER_DAY",
  "MAX_SEARCHES_PER_REEL",
];

/** Reads settings from the environment and refuses to run with any missing. */
export function pipelineConfig(): PipelineConfig {
  const env = process.env;
  const missing = [
    ...STRING_KEYS.filter((key) => !env[key]),
    ...NUMBER_KEYS.filter((key) => !env[key] || !Number.isFinite(Number(env[key]))),
  ];
  if (missing.length) throw new Error(`Missing or invalid settings: ${missing.join(", ")}`);

  return {
    apiKey: env.MODEL_API_KEY!,
    apiBase: env.MODEL_API_BASE!,
    modelExtract: env.MODEL_EXTRACT!,
    modelSearch: env.MODEL_SEARCH!,
    modelImage: env.MODEL_IMAGE!,
    priceImage: Number(env.PRICE_IMAGE_USD),
    tmdbRegion: env.TMDB_REGION!,
    priceInput: Number(env.PRICE_INPUT_PER_MTOK),
    priceCached: Number(env.PRICE_CACHED_INPUT_PER_MTOK),
    priceOutput: Number(env.PRICE_OUTPUT_PER_MTOK),
    priceSearch: Number(env.PRICE_SEARCH_PER_1K),
    budgetUsd: Number(env.AI_BUDGET_USD),
    maxReelsPerDay: Number(env.MAX_REELS_PER_USER_PER_DAY),
    maxAsksPerDay: Number(env.MAX_ASKS_PER_USER_PER_DAY),
    maxSearchesPerReel: Number(env.MAX_SEARCHES_PER_REEL),
    tmdbKey: env.TMDB_API_KEY ?? "",
    nominatimUrl: env.NOMINATIM_URL ?? "",
    siteUrl: env.NEXT_PUBLIC_SITE_URL ?? "",
  };
}

/** An error whose message is safe to show the person who sent the Reel. */
export class UserFacingError extends Error {}
