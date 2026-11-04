import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoEnrich, TitlePicker } from "@/components/EnrichControls";
import { CookMode } from "@/components/CookMode";
import { Icon, VIEW_ICONS } from "@/components/Icon";
import { ItemEditor } from "@/components/ItemEditor";
import { ClaimCheckPanel, DoItNow, Lessons, PlacePhotos, RecipeKit, WatchProviders, WhereToPlay } from "@/components/ItemExtras";
import { PlanSteps } from "@/components/PlanSteps";
import { RemoteImage } from "@/components/RemoteImage";
import { StepList } from "@/components/StepList";
import { Tick } from "@/components/Tick";
import { MapView } from "@/components/views/MapView";
import { requireUser } from "@/lib/supabase/server";
import { ITEM_SELECT, type Item, type ItemData, type List } from "@/lib/types";

const external = "inline-flex min-h-11 items-center underline";
const sectionTitle = "font-serif text-[22px]";

function Facts({ data }: { data: ItemData }) {
  if (!data.facts?.length) return null;
  return (
    <section className="mt-7">
      <h2 className={sectionTitle}>Good to know</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {data.facts.map((fact) => (
          <div key={`${fact.source}-${fact.label}`} className="rounded-[10px] border border-line bg-card px-4 py-3">
            <dt className="flex items-center justify-between gap-2 text-sm text-muted">
              {fact.label}
              {fact.url ? (
                <a href={fact.url} target="_blank" rel="noreferrer" className="rounded-full bg-tint px-2 text-xs underline">{fact.source}</a>
              ) : (
                <span className="rounded-full bg-tint px-2 text-xs">{fact.source}</span>
              )}
            </dt>
            <dd className="mt-0.5 font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PeopleSay({ data }: { data: ItemData }) {
  const { people_say: say } = data;
  if (!say) return null;
  return (
    <section className="mt-7 rounded-[14px] bg-t-blue p-5">
      <h2 className={sectionTitle}>What people say</h2>
      <p className="mt-1">{say.summary}</p>
      {say.themes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {say.themes.map((theme) => <li key={theme} className="rounded-full bg-card px-3 py-1 text-sm">{theme}</li>)}
        </ul>
      )}
      <ReviewQuotes data={data} />
      <p className="mt-3 text-sm">
        From{" "}
        {say.sources.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="underline">{source.label}</a>
        ))}
      </p>
    </section>
  );
}

function CastRow({ data }: { data: ItemData }) {
  if (!data.cast?.length) return null;
  return (
    <section className="mt-7">
      <h2 className={sectionTitle}>Cast</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {data.cast.map((person) => (
          <li key={person.name} className="w-24 shrink-0 text-sm">
            {person.photo ? (
              <RemoteImage src={person.photo} alt="" className="aspect-[2/3] w-full rounded-[10px] object-cover" />
            ) : (
              <span className="flex aspect-[2/3] w-full items-center justify-center rounded-[10px] bg-tint text-xl font-semibold">{person.name[0]}</span>
            )}
            <p className="mt-1 font-medium leading-tight">{person.name}</p>
            {person.character && <p className="leading-tight text-muted">{person.character}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewQuotes({ data }: { data: ItemData }) {
  if (!data.reviews?.length) return null;
  return (
    <section className="mt-5">
      <h3 className="font-semibold">From the reviews</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {data.reviews.map((review) => (
          <li key={review.author + review.excerpt.slice(0, 20)} className="rounded-[10px] border border-line bg-card p-3">
            <p className="text-sm">“{review.excerpt}”</p>
            <p className="mt-1 text-xs text-muted">
              {review.author}{review.rating !== null ? ` · ★ ${review.rating}/10` : ""}
              {review.url && <> · <a href={review.url} target="_blank" rel="noreferrer" className="underline">Read full review</a></>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SimilarRow({ data }: { data: ItemData }) {
  if (!data.similar?.length) return null;
  return (
    <section className="mt-7">
      <h2 className={sectionTitle}>You might also like</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {data.similar.map((title) => (
          <li key={title.title} className="w-24 shrink-0 text-sm">
            {title.image_url ? (
              <RemoteImage src={title.image_url} alt="" className="aspect-[2/3] w-full rounded-[10px] object-cover" />
            ) : (
              <span className="block aspect-[2/3] w-full rounded-[10px] bg-tint" />
            )}
            <p className="mt-1 font-medium leading-tight">{title.title}</p>
            {title.year && <p className="text-muted">{title.year}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function ItemPage(props: PageProps<"/app/items/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireUser();

  const [itemResult, listsResult] = await Promise.all([
    supabase.from("items").select(ITEM_SELECT).eq("id", id).maybeSingle(),
    supabase.from("lists").select("*").order("name"),
  ]);
  const failure = itemResult.error ?? listsResult.error;
  if (failure) throw new Error(failure.message);
  if (!itemResult.data) notFound();

  const item = itemResult.data as Item;
  const { data } = item;
  const pinned = typeof data.lat === "number" && typeof data.lng === "number";
  const planIds = data.plan?.map((step) => step.item_id) ?? [];
  const steps = data.steps ?? [];
  const hero = data.backdrop_url ?? data.photos?.[0]?.url;

  return (
    <article className="max-w-3xl">
      <div data-surface className="paper overflow-hidden">
        {hero && <RemoteImage src={hero} alt="" className="h-44 w-full object-cover sm:h-64" />}
        <div className="p-6 sm:p-8">
        {!data.enriched_at && !data.plan && <AutoEnrich id={item.id} />}
        {data.candidates && <TitlePicker id={item.id} candidates={data.candidates} />}
        <div className={`flex flex-col gap-5 sm:flex-row ${hero && data.image_url ? "-mt-20 sm:-mt-24" : ""}`}>
          {data.image_url ? (
            <RemoteImage src={data.image_url} alt="" className="w-36 self-start rounded-[10px] shadow-md sm:w-44" />
          ) : (
            <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-xl bg-t-yellow">
              <Icon name={VIEW_ICONS[item.lists?.view ?? "fallback"]} size={30} />
            </span>
          )}
          <div className={`min-w-0 ${hero && data.image_url ? "sm:pt-28" : ""}`}>
            {item.lists ? (
              <Link href={`/app/lists/${item.lists.slug}`} className="eyebrow hover:underline">{item.lists.name}</Link>
            ) : (
              <p className="eyebrow">Unsorted</p>
            )}
            <h1 className="mt-1 font-serif text-4xl leading-tight">{item.title}</h1>
            {data.genres && data.genres.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.genres.map((genre) => <li key={genre} className="rounded-full bg-t-lavender px-3 py-0.5 text-sm">{genre}</li>)}
              </ul>
            )}
            {item.summary && <p className="mt-3 text-lg">{item.summary}</p>}
          </div>
        </div>

        {data.tagline && <p className="mt-5 font-hand text-2xl">{data.tagline}</p>}
        {data.overview && <p className="mt-3">{data.overview}</p>}
        {data.subjects && data.subjects.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.subjects.map((subject) => <li key={subject} className="rounded-full bg-t-lavender px-3 py-0.5 text-sm">{subject}</li>)}
          </ul>
        )}
        {data.image_is_ai && <p className="mt-2 text-xs text-muted">Illustration by Muse Image, not a photo of the real dish.</p>}

        {(data.recap || data.caption_summary || data.comment_summary) && (
          <section className="mt-6 flex gap-3 rounded-[14px] bg-t-yellow p-5">
            <Tick mood="watching" size={56} className="hidden shrink-0 sm:block" />
            <div>
              <p className="eyebrow">What was in this Reel</p>
              {data.recap && <p className="mt-1">{data.recap}</p>}
              {data.caption_summary && (
                <p className="mt-2 text-sm"><span className="font-medium">Caption: </span>{data.caption_summary}</p>
              )}
              {data.comment_summary && (
                <p className="mt-2 text-sm"><span className="font-medium">Comments shown in the Reel: </span>{data.comment_summary}</p>
              )}
            </div>
          </section>
        )}

        <ClaimCheckPanel data={data} />
        <DoItNow item={item} />
        <WatchProviders data={data} title={item.title} />
        <WhereToPlay data={data} />
        <Lessons data={data} title={item.title} />
        <PlacePhotos data={data} />
        <RecipeKit data={data} />

        {data.plan && data.plan.length > 0 && <PlanSteps steps={data.plan} itemIds={planIds} />}

        <Facts data={data} />
        <CastRow data={data} />

        {data.trailer_key && (
          <section className="mt-7">
            <h2 className={sectionTitle}>Trailer</h2>
            <a
              href={`https://www.youtube.com/watch?v=${data.trailer_key}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Watch the ${item.title} trailer on YouTube`}
              className="relative mt-2 block overflow-hidden rounded-[10px]"
            >
              <RemoteImage src={`https://i.ytimg.com/vi/${data.trailer_key}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
              <span className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-primary text-on-primary">
                <Icon name="play" size={28} />
              </span>
            </a>
          </section>
        )}

        {data.preview_url && (
          <section className="mt-7">
            <h2 className={sectionTitle}>Preview</h2>
            <audio controls preload="none" src={data.preview_url} className="mt-2 w-full" />
          </section>
        )}

        {steps.length > 0 && (
          <>
            <StepList item={item} />
            <CookMode title={item.title} steps={steps} />
          </>
        )}

        {data.points && data.points.length > 0 && (
          <section className="mt-7">
            <h2 className={sectionTitle}>Key points</h2>
            <ul className="mt-1 list-disc pl-5">{data.points.map((value) => <li key={value}>{value}</li>)}</ul>
          </section>
        )}

        <PeopleSay data={data} />

        {pinned && (
          <section className="mt-7">
            <h2 className={sectionTitle}>On the map</h2>
            {data.address && <p className="text-muted">{data.address}</p>}
            <div className="mt-2"><MapView items={[item]} /></div>
          </section>
        )}

        <SimilarRow data={data} />

        {(item.evidence || item.reels?.source_url || data.source_url) && (
          <section className="mt-7 border-t border-line pt-4">
            <p className="eyebrow">Proof</p>
            {item.evidence && <p className="mt-1 text-sm">{item.evidence}</p>}
            <div className="flex flex-wrap gap-x-5 text-sm">
              {item.reels?.source_url && <a href={item.reels.source_url} target="_blank" rel="noreferrer" className={external}>Open Reel</a>}
              {data.source_url && <a href={data.source_url} target="_blank" rel="noreferrer" className={external}>Check the source</a>}
            </div>
          </section>
        )}

        <ItemEditor item={item} lists={(listsResult.data ?? []) as List[]} />
        </div>
      </div>
    </article>
  );
}
