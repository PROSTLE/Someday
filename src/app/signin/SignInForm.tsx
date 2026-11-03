"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { ErrorNote, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function SignInForm({ facebook, initialError }: { facebook: boolean; initialError?: string }) {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  // Without Facebook, email is the only way in, so show its form straight away.
  const [showEmail, setShowEmail] = useState(!facebook);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const redirectTo = () => `${location.origin}/auth/callback`;

  const signInWithFacebook = async () => {
    setBusy(true);
    setError(undefined);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: redirectTo(), scopes: "email" },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };

  const sendLink = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSentTo(email);
  };

  if (sentTo) {
    return <p className="rounded-[10px] bg-t-mint px-4 py-3">Check {sentTo} for your sign-in link.</p>;
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {error && <ErrorNote message={error} />}
      {facebook && (
        <button
          type="button"
          onClick={signInWithFacebook}
          disabled={busy}
          className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[10px] bg-[#1877F2] px-6 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Icon name="facebook" /> Continue with Facebook
        </button>
      )}
      {showEmail ? (
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <label className="text-left text-sm font-medium" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-[10px] border border-edge bg-page px-4"
          />
          <button disabled={busy} className={buttonClass("primary")}>Email me a link</button>
        </form>
      ) : (
        <button type="button" onClick={() => setShowEmail(true)} className={`${buttonClass("secondary")} min-h-[52px]`}>
          Continue with email
        </button>
      )}
    </div>
  );
}
