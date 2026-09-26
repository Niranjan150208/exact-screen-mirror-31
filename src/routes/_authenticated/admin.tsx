import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Check, PackageCheck, ShieldAlert, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill, TypeBadge } from "@/components/badges";
import { categoriesQuery, claimsQuery, itemsQuery, logActivity, notify } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ClaimStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — FindBack" },
      { name: "description", content: "Moderate reports, review claims and monitor recovery performance." },
      { property: "og:title", content: "Admin dashboard — FindBack" },
      { property: "og:description", content: "Moderate reports and review claims on FindBack." },
    ],
  }),
  component: AdminPage,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function AdminPage() {
  const { isAdmin, loading, displayName } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery(itemsQuery);
  const { data: claims = [] } = useQuery(claimsQuery(true));
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: logs = [] } = useQuery({
    queryKey: ["activity_logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      return data ?? [];
    },
  });
  const [newCategory, setNewCategory] = useState("");

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-20">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
        <h1 className="mt-4 text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-muted-foreground">
          This area is limited to moderators. Ask an existing admin to grant you the admin role.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const lost = items.filter((i) => i.type === "lost");
  const found = items.filter((i) => i.type === "found");
  const recovered = items.filter((i) => i.status === "recovered");
  const pendingClaims = claims.filter((c) => c.status === "pending" || c.status === "under_review");
  const suspicious = items.filter((i) => i.flagged);

  const lostVsFound = [
    { name: "Lost", value: lost.length },
    { name: "Found", value: found.length },
    { name: "Recovered", value: recovered.length },
  ];

  const byCategory = categories
    .map((c) => ({ name: c.name, value: items.filter((i) => i.category_id === c.id).length }))
    .filter((row) => row.value > 0);

  const byArea = Array.from(
    items.reduce((map, item) => {
      const key = item.area || "Other";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).map(([name, value]) => ({ name, value }));

  const monthly = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const label = date.toLocaleString(undefined, { month: "short" });
    const inMonth = (value: string | null) =>
      value ? new Date(value).getMonth() === date.getMonth() : false;
    return {
      name: label,
      reports: items.filter((i) => inMonth(i.created_at)).length,
      recoveries: items.filter((i) => inMonth(i.recovered_at)).length,
    };
  });

  async function reviewClaim(claimId: string, itemId: string, status: ClaimStatus) {
    const claim = claims.find((c) => c.id === claimId);
    await supabase
      .from("claims")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", claimId);
    if (status === "verified") {
      await supabase
        .from("items")
        .update({ status: "recovered", recovered_at: new Date().toISOString() })
        .eq("id", itemId);
    }
    if (claim) {
      await notify({
        userId: claim.claimant_id,
        title: status === "verified" ? "Claim approved by admin" : "Claim updated",
        kind: "claim",
      });
    }
    await logActivity("admin_claim_review", `${itemId} → ${status}`, displayName);
    toast.success("Claim updated.");
    queryClient.invalidateQueries();
  }

  async function removeItem(id: string, reportId: string) {
    await supabase.from("items").update({ status: "removed" }).eq("id", id);
    await logActivity("admin_item_removed", `${reportId} removed`, displayName);
    toast.success("Listing removed.");
    queryClient.invalidateQueries();
  }

  async function markRecovered(id: string, reportId: string) {
    await supabase
      .from("items")
      .update({ status: "recovered", recovered_at: new Date().toISOString() })
      .eq("id", id);
    await logActivity("admin_item_recovered", `${reportId} recovered`, displayName);
    toast.success("Marked recovered.");
    queryClient.invalidateQueries();
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    const { error } = await supabase
      .from("categories")
      .insert({ name, slug: name.toLowerCase().replace(/\s+/g, "-") });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewCategory("");
    toast.success("Category added.");
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Admin dashboard</h1>
      <p className="mt-2 text-muted-foreground">Moderation, verification and platform health.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total reports", value: items.length },
          { label: "Lost", value: lost.length },
          { label: "Found", value: found.length },
          { label: "Recovered", value: recovered.length },
          { label: "Pending claims", value: pendingClaims.length },
          { label: "Flagged", value: suspicious.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-5 shadow-soft">
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Lost vs found vs recovered">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lostVsFound}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {lostVsFound.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Reports by category">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                {byCategory.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Reports by location">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byArea} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
              <XAxis type="number" fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly reports &amp; recoveries">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="reports" stroke="var(--color-chart-1)" strokeWidth={2} />
              <Line type="monotone" dataKey="recoveries" stroke="var(--color-chart-2)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Tabs defaultValue="reports" className="mt-10">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="reports">All reports</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="logs">Activity log</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <div className="mt-6 overflow-x-auto rounded-2xl border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link to="/item/$id" params={{ id: item.id }} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                      <p className="font-mono text-[11px] text-muted-foreground">{item.report_id}</p>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={item.type} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{item.area || item.location}</td>
                    <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {item.status !== "recovered" && (
                          <Button size="sm" variant="outline" onClick={() => markRecovered(item.id, item.report_id)}>
                            <PackageCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => removeItem(item.id, item.report_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="claims">
          {claims.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              No claims submitted yet.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {claims.map((claim) => {
                const item = items.find((i) => i.id === claim.item_id);
                return (
                  <li key={claim.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item?.title ?? "Item"}</p>
                        <p className="text-xs text-muted-foreground">
                          {claim.claimant_name || "User"} · {new Date(claim.created_at).toLocaleString()}
                        </p>
                      </div>
                      <StatusPill status={claim.status} />
                    </div>
                    <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">
                      {claim.identifying_details}
                    </p>
                    {claim.status !== "recovered" && claim.status !== "verified" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="hero" onClick={() => reviewClaim(claim.id, claim.item_id, "verified")}>
                          <Check className="h-4 w-4" /> Verify
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
        </TabsContent>

        <TabsContent value="categories">
          <div className="mt-6 rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
              />
              <Button onClick={addCategory}>Add</Button>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.id} className="rounded-full border px-3 py-1.5 text-sm">
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <ul className="mt-6 space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="rounded-xl border bg-card px-4 py-3 text-sm shadow-soft">
                <span className="font-medium">{log.actor_name || "System"}</span>{" "}
                <span className="text-muted-foreground">{log.action}</span> — {log.detail}
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
