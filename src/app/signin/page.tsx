import { redirect } from "next/navigation";
import { Tick } from "@/components/Tick";
import { SetupNotice } from "@/components/ui";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./SignInForm";

/** Asks Supabase which sign-in providers are on, so the page never offers one that would fail. */
async function isFacebookEnabled() {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const settings = (await response.json()) as { external?: Record<string, boolean> };
    return settings.external?.facebook === true;
  } catch {
    return false;
  }
}

export default async function SignIn(props: PageProps<"/signin">) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");
  const [{ error }, facebook] = await Promise.all([props.searchParams, isFacebookEnabled()]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div data-surface className="paper flex w-full max-w-[480px] flex-col items-center rounded-2xl px-6 py-9 text-center sm:px-12">
        <Tick size={150} />
        <h1 className="font-serif text-[32px]">Welcome to Someday</h1>
        <p className="mb-6 text-xl text-muted">Sign in to see your list.</p>
        <SignInForm facebook={facebook} initialError={typeof error === "string" ? error : undefined} />
        <p className="mt-5 text-sm text-muted">Next, you’ll connect Instagram so you can send Reels to Tick.</p>
      </div>
    </main>
  );
}
