import Link from "next/link";
import { signOut } from "@/app/app/actions";
import { DeleteAccount, BubbleToggle } from "@/components/SettingsControls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageTitle, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";

const section = "rounded-[14px] border border-edge bg-card p-5";

export default async function Settings() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("instagram_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return (
    <div className="max-w-2xl">
      <PageTitle title="Settings" />
      <div className="flex flex-col gap-4">
        <section data-surface className={section}>
          <h2 className="font-serif text-[22px]">Account</h2>
          {user.email && <p className="text-muted">{user.email}</p>}
          <p className="mt-2">Instagram: {profile?.instagram_id ? "Connected" : "Not connected"}</p>
          {!profile?.instagram_id && <Link href="/connect" className="inline-flex min-h-11 items-center underline">Connect Instagram</Link>}
          <form action={signOut} className="mt-3">
            <button className={buttonClass("secondary")}>Sign out</button>
          </form>
        </section>

        <section data-surface className={section}>
          <h2 className="font-serif text-[22px]">Look and feel</h2>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span>Light or dark</span>
            <ThemeToggle />
          </div>
          <BubbleToggle />
        </section>

        <section data-surface className={section}>
          <h2 className="font-serif text-[22px]">Privacy</h2>
          <p className="mt-1 text-muted">
            Other people can’t see your list. We delete our copy of each video after reading it. If a Reel fails, its upload
            stays until you retry or remove it. Reels pass through Instagram and Meta’s AI, and content sent on free AI
            credits may be used to improve Meta’s products.
          </p>
          <DeleteAccount />
        </section>

        <section data-surface className={section}>
          <h2 className="font-serif text-[22px]">Credits</h2>
          <p className="mt-1 text-sm text-muted">
            This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability from JustWatch.
            Ratings shown as IMDb come from IMDb pages found by web search. Book data from Open Library. Music previews from Apple. Map data © OpenStreetMap contributors.
          </p>
        </section>
      </div>
    </div>
  );
}
