import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  EyeOff,
  FileSearch,
  HandHeart,
  Lock,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemCard } from "@/components/item-card";
import { StatCounter } from "@/components/stat-counter";
import { itemsQuery } from "@/lib/queries";
import { findMatches } from "@/lib/matching";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FindBack — Lost something? Let's bring it back." },
      {
        name: "description",
        content:
          "Report lost and found items, get smart percentage matches, verify ownership privately and recover belongings fast.",
      },
      { property: "og:title", content: "FindBack — Lost something? Let's bring it back." },
      {
        property: "og:description",
        content: "A smart lost & found platform for campuses, events and public places.",
      },
    ],
  }),
  component: Home,
});

const STEPS = [
  { icon: FileSearch, title: "Report", text: "Describe what you lost or found in under a minute." },
  { icon: Sparkles, title: "Smart match", text: "We compare category, colour, place and time instantly." },
  { icon: BadgeCheck, title: "Verify", text: "Private questions confirm the real owner — not a guesser." },
  { icon: HandHeart, title: "Recover", text: "Meet safely, hand over, and the report closes itself." },
];

const STORIES = [
  {
    quote: "I got a match notification within an hour of reporting my ID card. Picked it up the same evening.",
    name: "Aarav M.",
    role: "2nd year, Electronics",
  },
  {
    quote: "The verification questions meant I could hand the wallet over without worrying about the wrong person.",
    name: "Meera S.",
    role: "Volunteer, Sports Meet",
  },
  {
    quote: "Our help desk used to keep a paper register. FindBack cut our unclaimed pile by half.",
    name: "R. Nair",
    role: "Campus Help Desk",
  },
];

function Home() {
  const { data: items, isLoading } = useQuery(itemsQuery);
  const all = items ?? [];

  const reported = all.length;
  const recovered = all.filter((i) => i.status === "recovered").length;
  const active = all.filter((i) => i.status === "active").length;
  const matchCount = all
    .filter((i) => i.type === "lost")
    .reduce((sum, item) => sum + findMatches(item, all, 45).length, 0);

  const recent = all.slice(0, 6);

  return (
    <div>
      <section className="relative overflow-hidden">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="gradient-hero absolute inset-0 opacity-90" />
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:py-32">
          <div className="max-w-3xl">
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Smart matching for campuses, events &amp; public places
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] text-primary-foreground sm:text-6xl">
              Lost something?
              <br />
              Let's bring it back.
            </h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/80 sm:text-lg">
              Report a lost or found item in a minute. FindBack compares every new report against
              the whole database and surfaces the likely matches — with ownership verified before
              anything changes hands.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/report/lost">
                  I Lost Something <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/report/found">I Found Something</Link>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Items reported", value: reported },
              { label: "Items recovered", value: recovered },
              { label: "Active reports", value: active },
              { label: "Successful matches", value: matchCount },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-5 text-primary-foreground">
                <p className="text-3xl font-semibold sm:text-4xl">
                  <StatCounter value={stat.value} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-primary-foreground/70">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-center text-3xl font-semibold">How it works</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Four steps from panic to recovery.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="card-lift rounded-2xl border bg-card p-6 shadow-soft">
              <span className="gradient-brand flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground">
                <step.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
                Step {index + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Recent reports</h2>
              <p className="mt-2 text-muted-foreground">Fresh lost and found items from the community.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/browse">
                Browse all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-2xl" />
                ))
              : recent.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold">Trust &amp; safety, built in</h2>
            <p className="mt-3 text-muted-foreground">
              A lost & found platform only works if people feel safe using it. FindBack keeps
              identities and identifying details protected at every step.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { icon: EyeOff, title: "Private contacts", text: "Phone and email are never shown on public listings." },
                { icon: Lock, title: "Hidden details", text: "Unique identifiers stay secret and are used as proof questions." },
                { icon: ShieldCheck, title: "Verified handovers", text: "Claims are reviewed before ownership transfers." },
                { icon: Users, title: "Moderated", text: "Admins remove fraudulent listings and resolve disputes." },
              ].map((point) => (
                <div key={point.title} className="rounded-2xl border bg-card p-5 shadow-soft">
                  <point.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 text-sm font-semibold">{point.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{point.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {STORIES.map((story) => (
              <figure key={story.name} className="rounded-2xl border bg-card p-6 shadow-soft">
                <Quote className="h-6 w-6 text-primary/40" />
                <blockquote className="mt-3 text-sm leading-relaxed">{story.quote}</blockquote>
                <figcaption className="mt-4 text-sm font-semibold">
                  {story.name}
                  <span className="ml-2 font-normal text-muted-foreground">{story.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="gradient-brand relative overflow-hidden rounded-3xl px-8 py-14 text-center text-primary-foreground shadow-glow">
          <div className="surface-grid absolute inset-0 opacity-30" />
          <div className="relative">
            <h2 className="text-3xl font-semibold">Something missing right now?</h2>
            <p className="mx-auto mt-3 max-w-lg text-primary-foreground/85">
              Post it in a minute. Most matches appear within the first day.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="glass">
                <Link to="/report/lost">Report a lost item</Link>
              </Button>
              <Button asChild size="lg" variant="glass">
                <Link to="/report/found">Report a found item</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
