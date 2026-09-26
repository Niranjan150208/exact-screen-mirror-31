import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, PackageCheck, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemCard } from "@/components/item-card";
import { StatusPill } from "@/components/badges";
import { claimsQuery, itemsQuery, logActivity, notify } from "@/lib/queries";
import { findMatches } from "@/lib/matching";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ClaimStatus, Item } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — FindBack" },
      {
        name: "description",
        content: "Track your lost and found reports, potential matches, claims and recoveries.",
      },
      { property: "og:title", content: "Your dashboard — FindBack" },
      { property: "og:description", content: "Track your reports, matches, claims and recoveries." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, displayName } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery(itemsQuery);
  const { data: claims = [] } = useQuery(claimsQuery(Boolean(user)));

  const mine = items.filter((i) => i.reporter_id === user?.id);
  const myLost = mine.filter((i) => i.type === "lost");
  const myFound = mine.filter((i) => i.type === "found");
  const recovered = mine.filter((i) => i.status === "recovered");

  const matches = mine
    .filter((i) => i.status !== "recovered")
    .flatMap((item) => findMatches(item, items, 35).map((m) => ({ source: item, ...m })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 9);

  const myClaims = claims.filter((c) => c.claimant_id === user?.id);
  const claimsOnMyItems = claims.filter(
    (c) => c.claimant_id !== user?.id && mine.some((i) => i.id === c.item_id),
  );

  async function reviewClaim(claimId: string, itemId: string, status: ClaimStatus) {
    const claim = claims.find((c) => c.id === claimId);
    const item = items.find((i) => i.id === itemId);
    await supabase
      .from("claims")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", claimId);

    if (status === "verified" && item) {
      await supabase
        .from("items")
        .update({ status: "recovered", recovered_at: new Date().toISOString() })
        .eq("id", itemId);
      await supabase.from("claims").update({ status: "recovered" }).eq("id", claimId);
    }
    if (status === "rejected" && item) {
      await supabase.from("items").update({ status: "active" }).eq("id", itemId);
    }

    if (claim) {
      await notify({
        userId: claim.claimant_id,
        title:
          status === "verified"
            ? "Claim approved"
            : status === "rejected"
              ? "Claim rejected"
              : "More verification requested",
        body: item ? `Regarding "" ().` : "",
        kind: "claim",
      });
    }
    await logActivity("claim_reviewed", `${item?.report_id ?? itemId} → ${status}`, displayName);
    toast.success("Claim updated.");
    queryClient.invalidateQueries();
  }

  async function markRecovered(item: Item) {
    await supabase
      .from("items")
      .update({ status: "recovered", recovered_at: new Date().toISOString() })
      .eq("id", item.id);
    await logActivity("item_recovered", `${item.report_id} marked recovered`, displayName);
    toast.success("Marked as recovered. 🎉");
    queryClient.invalidateQueries();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Hi {displayName || "there"} 👋</h1>
          <p className="mt-2 text-muted-foreground">
            Everything you've reported, matched and recovered.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="lost" size="sm">
            <Link to="/report/lost">Report lost</Link>
          </Button>
          <Button asChild variant="found" size="sm">
            <Link to="/report/found">Report found</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Lost reports", value: myLost.length },
          { label: "Found reports", value: myFound.length },
          { label: "Potential matches", value: matches.length },
          { label: "Recovered", value: recovered.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-5 shadow-soft">
            <p className="text-3xl font-semibold">{stat.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="lost" className="mt-10">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="lost">My lost items</TabsTrigger>
          <TabsTrigger value="found">My found items</TabsTrigger>
          <TabsTrigger value="matches">Potential matches</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="history">Recovery history</TabsTrigger>
        </TabsList>

        <TabsContent value="lost">
          <ItemGrid items={myLost} emptyText="You haven't reported any lost items yet." onRecover={markRecovered} />
        </TabsContent>

        <TabsContent value="found">
          <ItemGrid items={myFound} emptyText="You haven't reported any found items yet." onRecover={markRecovered} />
        </TabsContent>

        <TabsContent value="matches">
          {matches.length === 0 ? (
            <Empty icon={Sparkles} text="No potential matches yet. We check every new report automatically." />
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((match) => (
                <div key={`${match.source.id}-${match.item.id}`} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    For your report <span className="font-medium">{match.source.title}</span>
                  </p>
                  <ItemCard item={match.item} matchScore={match.score} />
                  <ul className="flex flex-wrap gap-2">
                    {match.reasons.map((reason) => (
                      <li key={reason}>
                        <Badge variant="secondary" className="text-[11px]">
                          ✓ {reason}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="claims">
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-lg font-semibold">Claims you submitted</h2>
              {myClaims.length === 0 ? (
                <Empty icon={Search} text="You haven't claimed any items yet." />
              ) : (
                <ul className="mt-4 space-y-3">
                  {myClaims.map((claim) => {
                    const item = items.find((i) => i.id === claim.item_id);
                    return (
                      <li key={claim.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item?.title ?? "Item"}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted {new Date(claim.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusPill status={claim.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold">Claims on your reports</h2>
              {claimsOnMyItems.length === 0 ? (
                <Empty icon={Check} text="No one has claimed your reports yet." />
              ) : (
                <ul className="mt-4 space-y-3">
                  {claimsOnMyItems.map((claim) => {
                    const item = items.find((i) => i.id === claim.item_id);
                    return (
                      <li key={claim.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item?.title ?? "Item"}</p>
                            <p className="text-xs text-muted-foreground">
                              From {claim.claimant_name || "a user"} ·{" "}
                              {new Date(claim.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusPill status={claim.status} />
                        </div>
                        <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">
                          <span className="font-medium">Proof given: </span>
                          {claim.identifying_details}
                        </p>
                        {claim.status !== "recovered" && claim.status !== "verified" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="hero" onClick={() => reviewClaim(claim.id, claim.item_id, "verified")}>
                              <Check className="h-4 w-4" /> Approve &amp; recover
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => reviewClaim(claim.id, claim.item_id, "under_review")}>
                              Request more proof
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => reviewClaim(claim.id, claim.item_id, "rejected")}>
                              <X className="h-4 w-4" /> Reject
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="history">
          {recovered.length === 0 ? (
            <Empty icon={PackageCheck} text="No recoveries yet — they'll be celebrated here." />
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recovered.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ItemGrid({
  items,
  emptyText,
  onRecover,
}: {
  items: Item[];
  emptyText: string;
  onRecover: (item: Item) => void;
}) {
  if (items.length === 0) return <Empty icon={Search} text={emptyText} />;
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className="space-y-2">
          <ItemCard item={item} />
          {item.status !== "recovered" && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onRecover(item)}>
              <PackageCheck className="h-4 w-4" /> Mark as recovered
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed p-14 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
