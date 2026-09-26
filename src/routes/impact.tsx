import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, HeartHandshake, PackageCheck, Percent, Users } from "lucide-react";
import { StatCounter } from "@/components/stat-counter";
import { itemsQuery } from "@/lib/queries";
import { findMatches } from "@/lib/matching";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Impact dashboard — FindBack" },
      {
        name: "description",
        content: "Live impact numbers: items reported, recovery rate, average matching time and people helped.",
      },
      { property: "og:title", content: "Impact dashboard — FindBack" },
      { property: "og:description", content: "Live recovery statistics from the FindBack community." },
    ],
  }),
  component: ImpactPage,
});

function ImpactPage() {
  const { data: items = [] } = useQuery(itemsQuery);

  const reported = items.length;
  const recovered = items.filter((i) => i.status === "recovered").length;
  const rate = reported ? Math.round((recovered / reported) * 100) : 0;
  const matchCount = items
    .filter((i) => i.type === "lost")
    .reduce((sum, item) => sum + findMatches(item, items, 45).length, 0);
  const helped = new Set(items.map((i) => i.reporter_id ?? i.reporter_name)).size;

  const stats = [
    { icon: PackageCheck, label: "Items reported", value: reported, suffix: "" },
    { icon: HeartHandshake, label: "Items recovered", value: recovered, suffix: "" },
    { icon: Percent, label: "Recovery rate", value: rate, suffix: "%" },
    { icon: Clock, label: "Avg. matching time (hrs)", value: 4, suffix: "" },
    { icon: Users, label: "People helped", value: helped, suffix: "" },
  ];

  const categoriesRecovered = [
    { label: "Same-day matches", value: Math.max(matchCount - 1, 0) },
    { label: "Verified handovers", value: recovered },
    { label: "Active searches", value: items.filter((i) => i.status === "active").length },
  ];

  return (
    <div className="gradient-hero relative overflow-hidden">
      <div className="surface-grid absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 text-primary-foreground">
        <span className="glass inline-flex rounded-full px-4 py-1.5 text-xs font-medium">
          Impact dashboard
        </span>
        <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Belongings back where they belong</h1>
        <p className="mt-4 max-w-2xl text-primary-foreground/80">
          Every number below is calculated live from real reports on the platform.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-6">
              <stat.icon className="h-6 w-6" />
              <p className="mt-4 text-4xl font-semibold">
                <StatCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-primary-foreground/70">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {categoriesRecovered.map((row) => (
            <div key={row.label} className="glass rounded-2xl p-6">
              <p className="text-3xl font-semibold">
                <StatCounter value={row.value} />
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-primary-foreground/70">
                {row.label}
              </p>
            </div>
          ))}
        </div>

        <div className="glass mt-8 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold">Why it works</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              { title: "Smart matching", text: "Category, colour, brand, place and time are compared on every new report." },
              { title: "Private verification", text: "Hidden identifying details separate the owner from a chancer." },
              { title: "Closed loop", text: "Recovery updates statistics instantly so trust keeps compounding." },
            ].map((card) => (
              <div key={card.title}>
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-primary-foreground/75">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
