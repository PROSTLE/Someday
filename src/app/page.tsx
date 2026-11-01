import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Tick } from "@/components/Tick";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ButtonLink, Logo } from "@/components/ui";

const STEPS = [
  ["Send a Reel", "Share it to Tick in Instagram, just like sending it to a friend.", "instagram", "bg-t-blue"],
  ["Tick watches it", "Video, speech and on-screen text. One Reel can become many items.", "play", "bg-t-yellow"],
  ["It lands on your list", "Sorted, ready and easy to tick off.", "list", "bg-t-mint"],
];

const VIEWS = [
  ["Watch lists", "Posters and where to start", "film", "bg-t-blue"],
  ["Places", "Pinned on your map", "pin", "bg-t-mint"],
  ["Recipes", "Steps and a grocery list", "food", "bg-t-yellow"],
  ["Skills", "Small steps to learn it", "book", "bg-t-lavender"],
  ["Ideas", "Short, useful briefs", "idea", "bg-t-pink"],
  ["Deadlines", "Countdowns with the source", "calendar", "bg-t-yellow"],
  ["Shopping", "One tidy wishlist", "bag", "bg-t-mint"],
  ["Anything else", "Tick makes a new list", "plus", "bg-t-blue"],
];

const PRIVACY = [
  ["Only you see your list", "Other people can never open it."],
  ["Videos don’t stay", "We read the Reel, then delete our copy."],
  ["Your choice, always", "Delete everything in one tap."],
];

export default function Landing() {
  return (
    <>
      <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-10">
        <Logo />
        <div className="flex-1" />
        <a href="#how" className="hidden font-medium md:block">How it works</a>
        <a href="#lists" className="hidden font-medium md:block">Your lists</a>
        <a href="#privacy" className="hidden font-medium md:block">Privacy</a>
        <ThemeToggle />
        <span className="hidden sm:block"><ButtonLink href="/signin">Get started</ButtonLink></span>
      </nav>

      <main>
        <section className="bg-tint/70">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:py-24">
            <div>
              <p className="eyebrow">For every Reel you swore you’d come back to</p>
              <h1 className="mt-4 font-serif text-5xl leading-[1.05] sm:text-7xl">
                Saved it?
                <br />
                Now do it.
              </h1>
              <p className="mt-5 max-w-xl text-xl text-muted">
                Send any Reel to Someday in a DM. Tick watches it, finds what matters and puts it on your to-do list.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/signin">
                  <Icon name="arrow" /> Get started free
                </ButtonLink>
                <a href="#how" className="inline-flex min-h-11 items-center gap-2.5 rounded-[10px] border-[1.5px] border-edge px-6 font-semibold hover:bg-tint">
                  <Icon name="play" /> See how it works
                </a>
              </div>
              <p className="mt-4 text-sm text-muted">Only you can see your list.</p>
            </div>
            <div className="flex justify-center">
              <Tick mood="happy" size={320} />
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-10">
          <h2 className="text-center font-serif text-4xl sm:text-5xl">Three steps. That’s it.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(([title, text, icon, tint]) => (
              <article key={title} data-surface className="rounded-[14px] border border-edge bg-card p-7">
                <span className={`inline-flex rounded-xl p-3 ${tint}`}><Icon name={icon} /></span>
                <h3 className="mt-3 font-serif text-[22px]">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="lists" className="bg-tint/70">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-10">
            <div className="text-center">
              <h2 className="font-serif text-4xl sm:text-5xl">Your lists build themselves.</h2>
              <p className="mt-3 text-xl text-muted">Save something new and Tick makes a home for it.</p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {VIEWS.map(([title, text, icon, tint]) => (
                <article key={title} data-surface className="rounded-[14px] border border-edge bg-card p-5">
                  <span className={`inline-flex rounded-xl p-3 ${tint}`}><Icon name={icon} /></span>
                  <h3 className="mt-3 font-serif text-[22px]">{title}</h3>
                  <p className="text-sm text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-10 md:grid-cols-3">
          {PRIVACY.map(([title, text]) => (
            <div key={title}>
              <div className="flex items-center gap-2.5">
                <Icon name="shield" size={22} className="text-teal" />
                <h3 className="font-serif text-[22px]">{title}</h3>
              </div>
              <p className="mt-1 text-muted">{text}</p>
            </div>
          ))}
        </section>

        <section className="bg-t-mint">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-8 px-4 py-12 sm:flex-row">
            <Tick size={140} />
            <div>
              <h2 className="font-serif text-4xl sm:text-5xl">Your Reels are waiting.</h2>
              <ButtonLink href="/signin" className="mt-4">
                <Icon name="arrow" /> Get started free
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap gap-6 px-4 py-6 text-sm text-muted sm:px-10">
        <span className="flex-1">© Someday</span>
        <Link href="/signin">Sign in</Link>
      </footer>
    </>
  );
}
