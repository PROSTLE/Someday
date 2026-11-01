import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { missingSupabaseEnv } from "@/lib/env";
import { Icon } from "./Icon";
import { Tick } from "./Tick";

const BUTTON = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "border-[1.5px] border-edge text-ink hover:bg-tint",
  danger: "border-[1.5px] border-coral text-ink hover:bg-t-pink",
};

export const buttonClass = (kind: keyof typeof BUTTON = "primary") =>
  `inline-flex min-h-11 items-center justify-center gap-2.5 rounded-[10px] px-6 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON[kind]}`;

export function ButtonLink({
  kind,
  ...props
}: ComponentProps<typeof Link> & { kind?: keyof typeof BUTTON }) {
  return <Link {...props} className={`${buttonClass(kind)} ${props.className ?? ""}`} />;
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2.5">
      <Tick size={40} />
      <span className="font-serif text-[22px]">Someday</span>
    </Link>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="font-serif text-4xl leading-tight sm:text-5xl">{title}</h1>
      {sub && <p className="mt-1 text-lg text-muted sm:text-xl">{sub}</p>}
    </header>
  );
}

export function EmptyState({
  title,
  children,
  mood = "waving",
}: {
  title: string;
  children?: ReactNode;
  mood?: "waving" | "happy" | "watching";
}) {
  return (
    <div data-surface className="flex flex-col items-center rounded-[14px] border border-edge bg-card px-6 py-10 text-center">
      <Tick mood={mood} size={110} />
      <h2 className="mt-3 font-serif text-[22px]">{title}</h2>
      {children && <div className="mt-2 flex max-w-md flex-col items-center gap-4 text-muted">{children}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-[10px] bg-t-pink px-4 py-3 text-sm">
      {message}
    </p>
  );
}

export function SetupNotice() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-tint p-4">
      <div data-surface className="paper w-full max-w-lg p-8">
        <p className="eyebrow">Setup needed</p>
        <h1 className="mt-1 font-serif text-[32px]">Connect Supabase first</h1>
        <p className="mt-2 text-muted">
          Accounts and lists live in your Supabase project. Add these values to <code>web/.env.local</code>, run the
          migration, then restart the app.
        </p>
        <ul className="mt-4 space-y-2">
          {missingSupabaseEnv.map((name) => (
            <li key={name} className="flex items-center gap-2 text-sm">
              <Icon name="shield" size={18} className="text-teal" />
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
