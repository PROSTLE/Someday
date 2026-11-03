import { calendarUrl, directionsUrl } from "./links";
import type { Item, View } from "./types";

/** The single most useful thing to do with an item, right now. */
export type QuickAction = {
  kind: "watch" | "learn" | "go" | "cook" | "date" | "shop" | "open";
  label: string;
  /** A two or three word version for small cards. */
  short: string;
  href: string;
  external: boolean;
  logo?: string | null;
  icon: string;
};

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const youtubeUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const viewOf = (item: Item): View => item.lists?.view ?? "fallback";

export function quickAction(item: Item): QuickAction | null {
  const { data } = item;
  const view = viewOf(item);
  const page = `/app/items/${item.id}`;

  const providers = data.watch?.providers ?? [];
  const provider = providers.find((p) => p.kind === "stream" && p.url) ?? providers.find((p) => p.url);
  if (provider?.url) {
    const verb = provider.kind === "stream" ? "Watch" : provider.kind === "rent" ? "Rent" : "Buy";
    return { kind: "watch", label: `${verb} on ${provider.name}`, short: provider.name, href: provider.url, external: true, logo: provider.logo, icon: "play" };
  }
  if (data.trailer_key) {
    return { kind: "watch", label: "Watch the trailer", short: "Trailer", href: youtubeUrl(data.trailer_key), external: true, icon: "play" };
  }
  if (data.start) {
    // The label can be long ("Set up Unity Matchmaker"), so small cards just say "Start".
    return { kind: "learn", label: data.start.label, short: "Start", href: data.start.url, external: true, icon: "arrow" };
  }
  if (data.videos?.length) {
    return { kind: "learn", label: "Watch a lesson", short: "Lesson", href: youtubeUrl(data.videos[0].id), external: true, icon: "play" };
  }
  if (item.due_at) {
    return { kind: "date", label: "Add to calendar", short: "Calendar", href: calendarUrl(item), external: true, icon: "calendar" };
  }
  if (view === "map" || data.address || typeof data.lat === "number") {
    return { kind: "go", label: "Get directions", short: "Directions", href: directionsUrl(item), external: true, icon: "pin" };
  }
  if (data.steps?.length || data.ingredients?.length) {
    return { kind: "cook", label: "Start cooking", short: "Cook it", href: page, external: false, icon: "food" };
  }
  if (data.url) {
    return { kind: "shop", label: data.preview_url ? "Listen" : "Find it", short: data.preview_url ? "Listen" : "Find it", href: data.url, external: true, icon: "bag" };
  }
  return null;
}

/** The best picture for an item: its poster or cover, a real photo, or a lesson thumbnail. */
export function itemVisual(item: Item): string | null {
  const { data } = item;
  return data.image_url ?? data.photos?.[0]?.url ?? (data.videos?.[0] ? youtubeThumb(data.videos[0].id) : null);
}

/** Short facts worth showing on a card, like "20 min" or "Easy". */
export function itemChips(item: Item): string[] {
  const { data } = item;
  const difficulty = data.facts?.find((fact) => fact.label === "Difficulty")?.value;
  return [
    data.effort,
    difficulty,
    data.total_time,
    data.runtime,
    data.videos?.length ? `${data.videos.length} ${data.videos.length === 1 ? "lesson" : "lessons"}` : null,
  ].filter((chip): chip is string => Boolean(chip)).slice(0, 2);
}

/** Groups used by the home page filter. */
export const ACTION_GROUPS: { key: QuickAction["kind"] | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "watch", label: "Watch" },
  { key: "learn", label: "Learn" },
  { key: "go", label: "Go" },
  { key: "cook", label: "Cook" },
  { key: "date", label: "Deadlines" },
];
