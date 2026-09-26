import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemCard } from "@/components/item-card";
import { TypeBadge } from "@/components/badges";
import { categoriesQuery, itemsQuery } from "@/lib/queries";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse lost & found items — FindBack" },
      {
        name: "description",
        content: "Search every reported lost and found item by name, category, colour, brand, place and date.",
      },
      { property: "og:title", content: "Browse lost & found items — FindBack" },
      { property: "og:description", content: "Search reported lost and found items on FindBack." },
    ],
  }),
  component: BrowsePage,
});

const ANY = "any";

function BrowsePage() {
  const { data: items, isLoading } = useQuery(itemsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);

  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>(ANY);
  const [category, setCategory] = useState<string>(ANY);
  const [area, setArea] = useState<string>(ANY);
  const [colour, setColour] = useState<string>(ANY);
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "map">("grid");

  const all = items ?? [];
  const areas = useMemo(
    () => Array.from(new Set(all.map((i) => i.area).filter(Boolean))) as string[],
    [all],
  );
  const colours = useMemo(
    () => Array.from(new Set(all.map((i) => i.color).filter(Boolean))) as string[],
    [all],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = all.filter((item) => {
      if (type !== ANY && item.type !== type) return false;
      if (category !== ANY && item.category_id !== category) return false;
      if (area !== ANY && item.area !== area) return false;
      if (colour !== ANY && item.color !== colour) return false;
      if (!q) return true;
      return `${item.title} ${item.description} ${item.brand ?? ""} ${item.location} ${item.report_id}`
        .toLowerCase()
        .includes(q);
    });
    if (sort === "location") result.sort((a, b) => (a.area ?? "").localeCompare(b.area ?? ""));
    else if (sort === "oldest")
      result.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    else result.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return result;
  }, [all, query, type, category, area, colour, sort]);

  const byArea = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((item) => {
      const key = item.area || "Unspecified area";
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  function reset() {
    setQuery("");
    setType(ANY);
    setCategory(ANY);
    setArea(ANY);
    setColour(ANY);
    setSort("recent");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Browse reports</h1>
          <p className="mt-2 text-muted-foreground">
            {filtered.length} item{filtered.length === 1 ? "" : "s"} matching your filters.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" /> Grid
          </Button>
          <Button
            variant={view === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("map")}
          >
            <MapIcon className="h-4 w-4" /> Map view
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by item name, brand, place or report ID…"
            className="pl-9"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Lost &amp; found</SelectItem>
              <SelectItem value="lost">Lost only</SelectItem>
              <SelectItem value="found">Found only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All areas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={colour} onValueChange={setColour}>
            <SelectTrigger><SelectValue placeholder="Colour" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any colour</SelectItem>
              {colours.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="location">By location</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>
            <SlidersHorizontal className="h-4 w-4" /> Reset filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed p-14 text-center">
          <p className="text-lg font-semibold">No items match those filters</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try widening the category or clearing the search term.
          </p>
          <Button className="mt-5" variant="outline" onClick={reset}>
            Clear filters
          </Button>
        </div>
      ) : view === "grid" ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {byArea.map(([areaName, areaItems]) => (
            <div
              key={areaName}
              className="gradient-hero relative overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-soft"
            >
              <div className="surface-grid absolute inset-0 opacity-50" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{areaName}</h3>
                  <span className="glass rounded-full px-3 py-1 text-xs font-semibold">
                    {areaItems.length} report{areaItems.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-primary-foreground/70">
                  Approximate area only — exact locations are never published.
                </p>
                <ul className="mt-4 space-y-2">
                  {areaItems.slice(0, 5).map((item) => (
                    <li
                      key={item.id}
                      className="glass flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm"
                    >
                      <span className="line-clamp-1">{item.title}</span>
                      <TypeBadge type={item.type} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
