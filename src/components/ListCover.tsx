import type { CSSProperties } from "react";
import type { View } from "@/lib/types";
import { Icon, VIEW_ICONS } from "./Icon";
import { RemoteImage } from "./RemoteImage";

/** The few fields a cover needs from each item in the list. */
export type CoverItem = {
  id: string;
  title: string;
  image: string | null;
  lat: number | null;
  lng: number | null;
  dueAt: string | null;
};

type CoverSource = {
  id: string;
  title: string;
  due_at?: string | null;
  image?: unknown;
  lat?: unknown;
  lng?: unknown;
};

const num = (value: unknown) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
};

export function toCoverItem(row: CoverSource): CoverItem {
  return {
    id: row.id,
    title: row.title,
    image: typeof row.image === "string" && row.image ? row.image : null,
    lat: num(row.lat),
    lng: num(row.lng),
    dueAt: row.due_at ?? null,
  };
}

const NOTE_TINTS = ["bg-t-yellow", "bg-t-pink", "bg-t-blue", "bg-t-lavender"];
const TINTS = ["bg-t-blue", "bg-t-yellow", "bg-t-pink", "bg-t-lavender", "bg-t-mint"];

/** Spreads n cards around the centre: offsets in card widths, tilt in degrees. */
function fan(index: number, count: number, spread: number, tilt: number, lift = 0): CSSProperties {
  const offset = index - (count - 1) / 2;
  return {
    "--x": offset * spread,
    "--y": Math.abs(offset) * lift,
    "--r": `${offset * tilt}deg`,
    zIndex: index,
  } as CSSProperties;
}

/** Notes cascade diagonally so every title stays readable. */
function noteSpot(index: number, count: number): CSSProperties {
  const offset = index - (count - 1) / 2;
  return { "--x": offset * 0.62, "--y": offset * 0.42, "--r": `${(index % 2 ? 4 : -5)}deg`, zIndex: index } as CSSProperties;
}

// Where pins go when a place has no coordinates. Tips sit low enough to leave room for labels.
const PIN_SLOTS = [
  { left: 26, top: 80 },
  { left: 72, top: 70 },
  { left: 50, top: 97 },
  { left: 88, top: 96 },
  { left: 10, top: 97 },
];

/** Places pins by real coordinates when two or more places have them, otherwise in fixed slots. */
function pinPositions(items: CoverItem[]) {
  const located = items.filter((item) => item.lat !== null && item.lng !== null);
  const lats = located.map((item) => item.lat!);
  const lngs = located.map((item) => item.lng!);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  const useCoords = located.length > 1 && span > 0;

  return items.map((item, index) => {
    if (useCoords && item.lat !== null && item.lng !== null) {
      return { left: 20 + (60 * (item.lng - minLng)) / span, top: 68 + (28 * (maxLat - item.lat)) / span };
    }
    return PIN_SLOTS[index % PIN_SLOTS.length];
  });
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" });
}

function MapCover({ items }: { items: CoverItem[] }) {
  const shown = items.slice(0, 5);
  const positions = pinPositions(shown);
  return (
    <span className="relative block aspect-video w-full overflow-hidden bg-t-mint">
      <svg viewBox="0 0 320 180" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full text-teal">
        <path d="M-10 128 C 60 96, 110 150, 180 112 S 290 70, 330 92" fill="none" stroke="var(--sky)" strokeOpacity="0.45" strokeWidth="14" />
        <g fill="none" stroke="currentColor" strokeOpacity="0.22" strokeLinecap="round">
          <path d="M0 52 H 320" strokeWidth="5" />
          <path d="M92 0 V 180" strokeWidth="5" />
          <path d="M226 0 C 210 60, 250 110, 236 180" strokeWidth="4" />
          <path d="M0 160 L 140 30 L 320 20" strokeWidth="3" strokeDasharray="2 8" />
        </g>
        <g fill="var(--card)" fillOpacity="0.55">
          <rect x="18" y="66" width="56" height="34" rx="6" />
          <rect x="110" y="64" width="44" height="26" rx="6" />
          <rect x="250" y="122" width="52" height="36" rx="6" />
          <rect x="140" y="140" width="40" height="22" rx="6" />
        </g>
      </svg>
      {shown.map((item, index) => (
        <span
          key={item.id}
          className="cover-pin absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
          style={{ left: `${positions[index].left}%`, top: `${positions[index].top}%`, "--d": `${index * 60}ms` } as CSSProperties}
        >
          {index < 3 && (
            <span
              className={`mb-1 max-w-[110px] truncate rounded-full bg-card px-2 py-0.5 text-[11px] font-medium shadow-sm ${index > 0 ? "hidden sm:block" : ""}`}
            >
              {item.title}
            </span>
          )}
          {item.image ? (
            <span className="relative flex flex-col items-center">
              <RemoteImage src={item.image} alt="" className="size-9 rounded-full border-[3px] border-white object-cover shadow-lg sm:size-11" />
              <span className="-mt-1 h-2.5 w-2.5 rotate-45 bg-white shadow" />
            </span>
          ) : (
            <span className="flex h-6 w-6 -rotate-45 items-center justify-center rounded-[50%_50%_50%_0] bg-coral shadow-md">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function ImageFan({ items, view }: { items: CoverItem[]; view: View }) {
  const shown = items.filter((item) => item.image).slice(0, 4);
  const poster = view === "poster";
  return (
    <span className="relative block aspect-video w-full overflow-hidden bg-ink">
      <RemoteImage src={shown[0].image!} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-xl" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      {shown.map((item, index) => (
        <span
          key={item.id}
          className={`cover-card ${poster ? "aspect-[2/3] h-[80%]" : "aspect-square h-[64%]"}`}
          style={fan(index, shown.length, poster ? 0.55 : 0.5, 6, 0.04)}
        >
          <RemoteImage
            src={item.image!}
            alt=""
            className={`block h-full w-full rounded-md object-cover shadow-lg ${poster ? "ring-1 ring-white/25" : "border-4 border-white"}`}
          />
        </span>
      ))}
    </span>
  );
}

function NoteStack({ items, view, tint }: { items: CoverItem[]; view: View; tint: string }) {
  const shown = items.slice(0, 3);
  return (
    <span className={`relative block aspect-video w-full overflow-hidden ${tint}`}>
      <Icon name={VIEW_ICONS[view]} size={88} className="absolute -right-4 -bottom-5 opacity-10" />
      {shown.map((item, index) => (
        <span
          key={item.id}
          className={`cover-card w-[52%] rounded-lg p-2.5 shadow-md ring-1 ring-black/5 ${NOTE_TINTS[(index + 1) % NOTE_TINTS.length]}`}
          style={noteSpot(index, shown.length)}
        >
          {view === "timeline" && item.dueAt && (
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-coral">{shortDate(item.dueAt)}</span>
          )}
          <span className="line-clamp-2 font-hand text-[19px] leading-[1.05]">{item.title}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * A cover made from what's in the list: a fan of posters, a map of pins or a stack of notes.
 * It reacts to hover on the nearest `group` ancestor.
 */
export function ListCover({
  view,
  items,
  index,
  fallback,
}: {
  view: View;
  items: CoverItem[];
  index: number;
  fallback?: string;
}) {
  const tint = TINTS[index % TINTS.length];
  if (items.length === 0) {
    return fallback ? (
      <RemoteImage src={fallback} alt="" className="aspect-video w-full object-cover" />
    ) : (
      <span className={`flex aspect-video w-full items-center justify-center ${tint}`}>
        <Icon name={VIEW_ICONS[view]} size={30} />
      </span>
    );
  }
  if (view === "map") return <MapCover items={items} />;
  if (items.some((item) => item.image)) return <ImageFan items={items} view={view} />;
  return <NoteStack items={items} view={view} tint={tint} />;
}
