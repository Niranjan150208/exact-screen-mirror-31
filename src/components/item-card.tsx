import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemPhoto } from "@/components/item-photo";
import { StatusPill, TypeBadge } from "@/components/badges";
import type { Item } from "@/lib/types";

export function ItemCard({ item, matchScore }: { item: Item; matchScore?: number }) {
  return (
    <article className="card-lift group overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="relative h-40 overflow-hidden">
        <ItemPhoto path={item.photo_url} alt={item.title} className="h-40 w-full" />
        <div className="absolute left-3 top-3 flex gap-2">
          <TypeBadge type={item.type} />
          {item.status === "recovered" && <StatusPill status="recovered" />}
        </div>
        {typeof matchScore === "number" && (
          <div className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-soft">
            {matchScore}% match
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold">{item.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {item.area || item.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(item.event_date).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className="font-mono text-[11px]">
            {item.report_id}
          </Badge>
          <Button asChild size="sm" variant="secondary">
            <Link to="/item/$id" params={{ id: item.id }}>
              View details
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
