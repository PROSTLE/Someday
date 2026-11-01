import { randomBytes } from "node:crypto";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { Tick } from "@/components/Tick";
import { ButtonLink, ErrorNote, SetupNotice, buttonClass } from "@/components/ui";
import { instagramBot, instagramChatUrl, isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => `SOME-${[...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join("")}`;

export default async function Connect() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { supabase, user } = await requireUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("instagram_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.instagram_id) {
    return (
      <Shell mood="happy" speech="All set!">
        <p className="eyebrow">Connected</p>
        <h1 className="font-serif text-[32px]">Instagram is connected</h1>
        <p className="mb-4 text-xl text-muted">Send Tick a Reel and it will appear on your list.</p>
        <ButtonLink href="/app">Go to my list</ButtonLink>
      </Shell>
    );
  }

  const { data: existing, error: readError } = await supabase
    .from("link_codes")
    .select("code")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let code = existing?.code as string | undefined;
  let insertError: string | undefined;
  if (!code && !readError) {
    const generated = newCode();
    const { error } = await supabase.from("link_codes").insert({ code: generated, user_id: user.id });
    if (error) insertError = error.message;
    else code = generated;
  }

  const failure = profileError?.message ?? readError?.message ?? insertError;
  const chatUrl = code ? instagramChatUrl(code) : null;

  return (
    <Shell mood="watching" speech="Almost there!">
      <p className="eyebrow">Step 2 of 2</p>
      <h1 className="font-serif text-[32px]">Connect your Instagram</h1>
      <p className="text-xl text-muted">So Tick knows which Reels are yours.</p>
      {failure && <div className="mt-4"><ErrorNote message={failure} /></div>}
      {!instagramBot && (
        <div className="mt-4">
          <ErrorNote message="The Instagram bot isn’t set up yet. Add NEXT_PUBLIC_INSTAGRAM_BOT_USERNAME to continue." />
        </div>
      )}
      {chatUrl && (
        <>
          <a href={chatUrl} target="_blank" rel="noreferrer" className={`${buttonClass()} mt-5 w-full`}>
            <Icon name="instagram" /> Open chat with Tick
          </a>
          <p className="mt-2 text-sm text-muted">We’ll open Instagram and link your account automatically.</p>
        </>
      )}
      {code && instagramBot && (
        <>
          <hr className="my-6 border-line" />
          <p>Link didn’t work? Send this code to @{instagramBot} instead.</p>
          <div className="mt-3 flex items-center gap-3 rounded-[10px] bg-t-mint py-1.5 pl-5 pr-2">
            <span className="flex-1 font-serif text-[22px] break-all">{code}</span>
            <CopyButton value={code} />
          </div>
        </>
      )}
      <p className="mt-6 flex gap-2.5 text-sm text-muted">
        <Icon name="shield" size={20} className="shrink-0 text-teal" />
        Tick only sees Reels you send to it. Your other DMs stay yours.
      </p>
      <Link href="/app" className="mt-4 inline-flex min-h-11 items-center text-sm text-muted underline">
        Skip for now
      </Link>
    </Shell>
  );
}

function Shell({
  children,
  mood,
  speech,
}: {
  children: React.ReactNode;
  mood: "happy" | "watching";
  speech: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-4 lg:flex-row">
      <div data-surface className="paper w-full max-w-[600px] rounded-lg p-6 sm:p-12">
        {children}
      </div>
      <div className="hidden flex-col items-center lg:flex">
        <p className="rounded-2xl bg-t-yellow px-4 py-2 font-hand text-[26px] font-bold">{speech}</p>
        <Tick mood={mood} size={180} />
      </div>
    </main>
  );
}
