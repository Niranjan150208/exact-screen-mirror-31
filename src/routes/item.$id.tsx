import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  Flag,
  MapPin,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ItemPhoto } from "@/components/item-photo";
import { ItemCard } from "@/components/item-card";
import { StatusPill, TypeBadge } from "@/components/badges";
import { categoriesQuery, itemsQuery, logActivity, notify } from "@/lib/queries";
import { findMatches } from "@/lib/matching";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/item/$id")({
  head: () => ({
    meta: [
      { title: "Item details — FindBack" },
      { name: "description", content: "Item report details, potential matches and claim options on FindBack." },
      { property: "og:title", content: "Item details — FindBack" },
      { property: "og:description", content: "See report details and potential matches on FindBack." },
    ],
  }),
  component: ItemDetail,
});

function ItemDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, displayName } = useAuth();
  const { data: items, isLoading } = useQuery(itemsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);

  const [details, setDetails] = useState("");
  const [whenLost, setWhenLost] = useState("");
  const [proof, setProof] = useState("");
  const [open, setOpen] = useState(false);

  const all = items ?? [];
  const item = all.find((i) => i.id === id);
  const matches = item ? findMatches(item, all, 35).slice(0, 4) : [];
  const category = categories.find((c) => c.id === item?.category_id);

  const claim = useMutation({
    mutationFn: async () => {
      if (!item || !user) throw new Error("Sign in required");
      const { error } = await supabase.from("claims").insert({
        item_id: item.id,
        claimant_id: user.id,
        claimant_name: displayName,
        identifying_details: proof,
        answers: { where_lost: whenLost, extra: details },
      });
      if (error) throw error;
      await supabase.from("items").update({ status: "under_review" }).eq("id", item.id);
      if (item.reporter_id) {
        await notify({
          userId: item.reporter_id,
          title: "New claim submitted",
          body: `Someone has claimed "${item.title}". Review the verification answers.`,
          kind: "claim",
        });
      }
      await notify({
        userId: user.id,
        title: "Claim submitted",
        body: `Your claim for "${item.title}" is pending review.`,
        kind: "claim",
      });
      await logActivity("claim_submitted", `${item.report_id} claimed`, displayName);
    },
    onSuccess: () => {
      toast.success("Claim submitted — you'll be notified after review.");
      setOpen(false);
      setDetails("");
      setProof("");
      setWhenLost("");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function flagItem() {
    if (!item) return;
    await logActivity("item_flagged", `${item.report_id} reported as incorrect`, displayName || "Guest");
    toast.success("Thanks — an admin will review this listing.");
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Report not found</h1>
        <p className="mt-2 text-muted-foreground">This listing may have been removed.</p>
        <Button asChild className="mt-6">
          <Link to="/browse">Back to browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
            <ItemPhoto path={item.photo_url} alt={item.title} className="h-80 w-full" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <TypeBadge type={item.type} />
            <StatusPill status={item.status} />
            {category && <Badge variant="outline">{category.name}</Badge>}
            <Badge variant="outline" className="font-mono text-[11px]">
              {item.report_id}
            </Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold">{item.title}</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{item.description}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Detail icon={MapPin} label="General location" value={item.area || item.location} />
            <Detail
              icon={CalendarDays}
              label={item.type === "lost" ? "Date lost" : "Date found"}
              value={new Date(item.event_date).toLocaleDateString()}
            />
            {item.event_time && <Detail icon={Clock} label="Approximate time" value={item.event_time} />}
            {item.color && <Detail label="Colour" value={item.color} />}
            {item.brand && <Detail label="Brand" value={item.brand} />}
            {item.reward && <Detail label="Reward offered" value={item.reward} />}
            {item.type === "found" && item.current_location && (
              <Detail label="Currently held at" value={item.current_location} />
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-dashed bg-secondary/40 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-success" /> Protected details
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Unique identifying features and the reporter's contact information are hidden. They
              are used as verification questions when someone claims this item.
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Is this yours?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Answer a few private questions and the reporter or an admin will verify your claim.
            </p>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="hero"
                  className="mt-4 w-full"
                  onClick={(e) => {
                    if (!user) {
                      e.preventDefault();
                      toast.error("Please sign in to claim an item.");
                      navigate({ to: "/auth" });
                    }
                  }}
                >
                  Claim this item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Verify ownership</DialogTitle>
                  <DialogDescription>
                    Your answers stay private and are only shown to the reporter and admins.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="proof">Describe an identifying feature that is not listed</Label>
                    <Textarea
                      id="proof"
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                      placeholder="e.g. a scratch on the corner, a sticker, contents inside"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="when">Where and when did you lose it?</Label>
                    <Input
                      id="when"
                      value={whenLost}
                      onChange={(e) => setWhenLost(e.target.value)}
                      placeholder="e.g. Library, Tuesday afternoon"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="extra">Anything else that proves it is yours?</Label>
                    <Textarea
                      id="extra"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="hero"
                    disabled={claim.isPending || proof.trim().length < 5}
                    onClick={() => claim.mutate()}
                  >
                    Submit claim
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="mt-2 w-full" asChild>
              <Link to="/browse">
                <MessageSquare className="h-4 w-4" /> Contact via FindBack
              </Link>
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Messages route through the platform — direct contact details stay private.
            </p>

            <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={flagItem}>
              <Flag className="h-4 w-4" /> Report incorrect listing
            </Button>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Potential matches</h2>
            {matches.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No strong matches yet. We keep checking every new report.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {matches.map((match) => (
                  <li key={match.item.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to="/item/$id"
                        params={{ id: match.item.id }}
                        className="line-clamp-2 text-sm font-medium hover:underline"
                      >
                        {match.item.title}
                      </Link>
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {match.score}%
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {match.reasons.map((reason) => (
                        <li key={reason} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-success" /> {reason}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-warning/10 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" /> Meet safely
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Always hand over items in a public place or at the campus help desk.
            </p>
          </div>
        </aside>
      </div>

      {matches.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-semibold">Matched reports in detail</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <ItemCard key={match.item.id} item={match.item} matchScore={match.score} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
