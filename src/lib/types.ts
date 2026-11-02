export const VIEWS = ["poster", "map", "steps", "timeline", "wishlist", "gallery", "notes", "fallback"] as const;
export type View = (typeof VIEWS)[number];

export const VIEW_LABELS: Record<View, string> = {
  poster: "Posters",
  map: "Map",
  steps: "Steps",
  timeline: "Timeline",
  wishlist: "Wishlist",
  gallery: "Gallery",
  notes: "Notes",
  fallback: "Simple cards",
};

export type Step = { text: string; done?: boolean };

export type Fact = { label: string; value: string; source: string; url?: string | null };

export type PeopleSay = {
  summary: string;
  themes: string[];
  sources: { label: string; url: string }[];
};

export type WatchOptions = {
  region: string;
  link: string | null;
  stream: string[];
  rent: string[];
  buy: string[];
};

export type CastMember = { name: string; character: string | null; photo: string | null };
export type ReviewQuote = { author: string; rating: number | null; excerpt: string; url: string | null };
export type SimilarTitle = { title: string; year: number | null; image_url: string | null };
export type TitleCandidate = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  overview: string;
  image_url: string | null;
};

export type PlanStep = { time: string; item_id: string; title: string; why: string };

export type ItemData = {
  recap?: string;
  next_step?: string;
  comment_summary?: string;
  facts?: Fact[];
  genres?: string[];
  overview?: string;
  trailer_key?: string;
  similar?: SimilarTitle[];
  cast?: CastMember[];
  reviews?: ReviewQuote[];
  backdrop_url?: string;
  tagline?: string;
  imdb_url?: string;
  candidates?: TitleCandidate[];
  caption_summary?: string;
  subjects?: string[];
  image_is_ai?: boolean;
  enriched_at?: string;
  watch?: WatchOptions;
  people_say?: PeopleSay;
  preview_url?: string;
  plan?: PlanStep[];
  year?: number;
  rating?: number;
  runtime?: string;
  image_url?: string;
  address?: string;
  place_type?: string;
  lat?: number;
  lng?: number;
  ingredients?: string[];
  steps?: Step[];
  source_url?: string;
  price?: string;
  url?: string;
  points?: string[];
};

export type List = {
  id: string;
  name: string;
  slug: string;
  view: View;
  created_at: string;
};

export type ListWithCount = List & { open_count: number };

export type Reel = {
  id: string;
  source_url: string | null;
  caption: string | null;
  note: string | null;
  status: "received" | "watching" | "done" | "failed";
  error: string | null;
  media_path: string | null;
  media_url: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  list_id: string | null;
  reel_id: string | null;
  title: string;
  summary: string | null;
  evidence: string | null;
  data: ItemData;
  status: "todo" | "done";
  needs_review: boolean;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
  lists?: { name: string; slug: string; view: View } | null;
  reels?: { source_url: string | null } | null;
};

export const ITEM_SELECT = "*, lists(name, slug, view), reels(source_url)";
