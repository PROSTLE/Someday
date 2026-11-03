import { quickAction, youtubeThumb, youtubeUrl } from "@/lib/quick";
import { calendarUrl, directionsUrl } from "@/lib/links";
import type { Item, ItemData } from "@/lib/types";
import { CopyButton } from "./CopyButton";
import { Icon } from "./Icon";
import { RemoteImage } from "./RemoteImage";
import { buttonClass } from "./ui";

const sectionTitle = "font-serif text-[22px]";
const chip = "inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-sm font-medium";

type Action = { label: string; href: string; icon: string; logo?: string | null };

function ActionLink({ action, primary }: { action: Action; primary?: boolean }) {
  return (
    <a href={action.href} target={action.href.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className={buttonClass(primary ? "primary" : "secondary")}>
      {action.logo ? <RemoteImage src={action.logo} alt="" className="size-6 rounded-md" /> : <Icon name={action.icon} size={20} />}
      {action.label}
    </a>
  );
}

/** The top panel: what to do next, the one big button, and the quick facts that help you start. */
export function DoItNow({ item }: { item: Item }) {
  const { data } = item;
  const main = quickAction(item);
  const difficulty = data.facts?.find((fact) => fact.label === "Difficulty")?.value;
  const hasPlace = Boolean(data.address || typeof data.lat === "number" || item.lists?.view === "map");

  const more: Action[] = [
    data.trailer_key && main?.label !== "Watch the trailer" ? { label: "Trailer", href: youtubeUrl(data.trailer_key), icon: "play" } : null,
    data.imdb_url ? { label: "IMDb", href: data.imdb_url, icon: "arrow" } : null,
    hasPlace && main?.kind !== "go" ? { label: "Directions", href: directionsUrl(item), icon: "pin" } : null,
    item.due_at && main?.kind !== "date" ? { label: "Add to calendar", href: calendarUrl(item), icon: "calendar" } : null,
    data.url && main?.kind !== "shop" ? { label: data.preview_url ? "Open in Apple Music" : "Find it", href: data.url, icon: "bag" } : null,
    data.recipe_url ? { label: "Full recipe", href: data.recipe_url, icon: "food" } : null,
  ].filter((action): action is Action => Boolean(action));

  const chips = [
    data.effort && { icon: "calendar", text: `About ${data.effort}` },
    difficulty && { icon: "idea", text: difficulty },
    data.total_time && { icon: "calendar", text: data.total_time },
    data.runtime && { icon: "film", text: data.runtime },
  ].filter(Boolean) as { icon: string; text: string }[];

  if (!main && !data.next_step && more.length === 0) return null;
  return (
    <section className="mt-6 rounded-[16px] bg-t-mint p-5 sm:p-6">
      <p className="eyebrow">Do it now</p>
      {data.next_step && <p className="mt-1 font-serif text-[24px] leading-snug">{data.next_step}</p>}
      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => <li key={c.text} className={chip}><Icon name={c.icon} size={15} />{c.text}</li>)}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {main && <ActionLink primary action={{ label: main.label, href: main.href, icon: main.icon, logo: main.logo }} />}
        {more.map((action) => <ActionLink key={action.label} action={action} />)}
      </div>
    </section>
  );
}

/** Every service the title is on, with logos. Tapping one opens that service. */
export function WatchProviders({ data, title }: { data: ItemData; title: string }) {
  const { watch } = data;
  if (!watch) return null;
  const providers = watch.providers ?? [];
  const country = new Intl.DisplayNames(["en"], { type: "region" }).of(watch.region) ?? watch.region;
  const kinds = [["stream", "Stream"], ["rent", "Rent"], ["buy", "Buy"]] as const;
  return (
    <section className="mt-7">
      <h2 className={sectionTitle}>Where to watch in {country}</h2>
      {providers.length === 0 ? (
        <p className="mt-2">Not streaming in {country} right now.{" "}
          <a href={`https://www.justwatch.com/in/search?q=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" className="underline">Check JustWatch</a>
        </p>
      ) : (
        kinds.map(([kind, label]) => {
          const list = providers.filter((p) => p.kind === kind);
          if (!list.length) return null;
          return (
            <div key={kind} className="mt-3">
              <p className="text-sm text-muted">{label}</p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {list.map((p) => (
                  <li key={p.name}>
                    <a
                      href={p.url ?? watch.link ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-12 items-center gap-2.5 rounded-[12px] border border-edge bg-card py-1.5 pr-4 pl-1.5 font-medium transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {p.logo ? <RemoteImage src={p.logo} alt="" className="size-9 rounded-[8px]" /> : <Icon name="film" size={22} />}
                      {p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
      <p className="mt-2 text-xs text-muted">Availability from JustWatch via TMDB. Links open a search on each service.</p>
    </section>
  );
}

/** Short lessons, confirmed on YouTube, so you can learn it in the same sitting. */
export function Lessons({ data, title }: { data: ItemData; title: string }) {
  if (!data.videos?.length && !data.video_search) return null;
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(data.video_search ?? title)}`;
  return (
    <section className="mt-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={sectionTitle}>Learn it in one sitting</h2>
        <a href={search} target="_blank" rel="noreferrer" className="text-sm underline">More on YouTube</a>
      </div>
      {data.videos?.length ? (
        <ul className="mt-3 grid gap-4 sm:grid-cols-3">
          {data.videos.map((video, index) => (
            <li key={video.id}>
              <a href={youtubeUrl(video.id)} target="_blank" rel="noreferrer" className="group block">
                <span className="relative block overflow-hidden rounded-[12px] shadow-sm">
                  <RemoteImage src={youtubeThumb(video.id)} alt="" className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105" />
                  <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-black/70 text-white transition group-hover:scale-110 group-hover:bg-coral">
                    <Icon name="play" size={22} />
                  </span>
                  {index === 0 && <span className="absolute top-2 left-2 rounded-full bg-yellow px-2 py-0.5 text-xs font-semibold text-ink">Start here</span>}
                </span>
                <span className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:underline">{video.title}</span>
                <span className="block text-xs text-muted">{video.channel}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <a href={search} target="_blank" rel="noreferrer" className={`mt-3 ${buttonClass("secondary")}`}><Icon name="play" size={20} /> Find lessons on YouTube</a>
      )}
    </section>
  );
}

/** Real photos from Wikimedia Commons, each credited, plus a short Wikipedia intro. */
export function PlacePhotos({ data }: { data: ItemData }) {
  const photos = data.photos ?? [];
  if (!photos.length && !data.about) return null;
  return (
    <section className="mt-7">
      <h2 className={sectionTitle}>See it before you go</h2>
      {data.about && (
        <p className="mt-1">
          {data.about.text}{" "}
          <a href={data.about.url} target="_blank" rel="noreferrer" className="text-sm text-muted underline">Wikipedia</a>
        </p>
      )}
      {photos.length > 0 && (
        <ul className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {photos.map((photo, index) => (
            <li key={photo.url} className={`shrink-0 snap-start ${index === 0 ? "w-[85%] sm:w-[60%]" : "w-[60%] sm:w-[36%]"}`}>
              <a href={photo.page} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-[12px]">
                <RemoteImage src={photo.url} alt="" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-1.5 text-[11px] text-white/90">
                  {photo.credit} · {photo.license}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {photos.length > 0 && <p className="text-xs text-muted">Photos from Wikimedia Commons. Tap one for its licence.</p>}
    </section>
  );
}

/** Everything to gather before cooking: time, tools and a copyable shopping list. */
export function RecipeKit({ data }: { data: ItemData }) {
  const ingredients = data.ingredients ?? [];
  const equipment = data.equipment ?? [];
  if (!ingredients.length && !equipment.length) return null;
  const fromWeb = data.ingredients_from === "web" && data.recipe_url;
  return (
    <section className="mt-7 rounded-[16px] bg-t-yellow p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={sectionTitle}>What you’ll need</h2>
        {ingredients.length > 0 && <CopyButton value={ingredients.join("\n")} label="Copy shopping list" />}
      </div>
      {equipment.length > 0 && (
        <>
          <p className="mt-3 text-sm font-medium text-muted">Kitchen kit</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {equipment.map((tool) => <li key={tool} className={chip}><Icon name="food" size={15} />{tool}</li>)}
          </ul>
        </>
      )}
      {ingredients.length > 0 && (
        <>
          <p className="mt-4 text-sm font-medium text-muted">
            Ingredients{" "}
            <span className="rounded-full bg-card px-2 py-0.5 text-xs">
              {fromWeb ? `From ${new URL(data.recipe_url!).hostname.replace(/^www\./, "")}, as the Reel didn’t list them` : "From the Reel"}
            </span>
          </p>
          <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {ingredients.map((value) => (
              <li key={value}>
                <label className="flex cursor-pointer items-start gap-2">
                  <input type="checkbox" className="peer mt-1 size-4 accent-teal" />
                  <span className="peer-checked:text-muted peer-checked:line-through">{value}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
