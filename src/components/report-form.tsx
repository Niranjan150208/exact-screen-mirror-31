import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ImagePlus, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoriesQuery, itemsQuery, logActivity, notify } from "@/lib/queries";
import { findMatches, type MatchResult } from "@/lib/matching";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Item, ItemType } from "@/lib/types";

const COPY = {
  lost: {
    title: "Report a lost item",
    subtitle: "The more detail you add, the better the matches we can find.",
    dateLabel: "Date lost",
    locationLabel: "Where did you lose it?",
    featuresLabel: "Unique identifying features (kept private)",
  },
  found: {
    title: "Report a found item",
    subtitle: "Thank you for helping someone get their belongings back.",
    dateLabel: "Date found",
    locationLabel: "Where did you find it?",
    featuresLabel: "Visible identifying features (kept private)",
  },
} as const;

export function ReportForm({ type }: { type: ItemType }) {
  const copy = COPY[type];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, displayName } = useAuth();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: existing = [] } = useQuery(itemsQuery);

  const [form, setForm] = useState({
    title: "",
    category_id: "",
    description: "",
    event_date: new Date().toISOString().slice(0, 10),
    event_time: "",
    location: "",
    area: "",
    color: "",
    brand: "",
    unique_features: "",
    reward: "",
    contact_preference: "in_app",
    current_location: "",
  });
  const [handover, setHandover] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ item: Item; matches: MatchResult<Item>[] } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      let photoPath: string | null = null;
      if (file) {
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "")}`;
        const { error: uploadError } = await supabase.storage
          .from("item-photos")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        photoPath = path;
      }

      const { data, error } = await supabase
        .from("items")
        .insert({
          type,
          title: form.title,
          category_id: form.category_id || null,
          description: form.description,
          event_date: form.event_date,
          event_time: form.event_time || null,
          location: form.location,
          area: form.area || form.location,
          color: form.color || null,
          brand: form.brand || null,
          unique_features: form.unique_features || null,
          reward: type === "lost" ? form.reward || null : null,
          contact_preference: form.contact_preference,
          current_location: type === "found" ? form.current_location || null : null,
          willing_to_handover: type === "found" ? handover : null,
          photo_url: photoPath,
          reporter_id: user.id,
          reporter_name: displayName || "FindBack user",
        })
        .select()
        .single();
      if (error) throw error;

      const created = data as unknown as Item;
      const matches = findMatches(created, existing, 35).slice(0, 5);

      await notify({
        userId: user.id,
        title: matches.length ? `${matches.length} potential match found` : "Report created",
        body: matches.length
          ? `We found possible matches for "${created.title}" (${created.report_id}).`
          : `Your report ${created.report_id} is live. We'll alert you when a match appears.`,
        kind: matches.length ? "match" : "info",
      });
      await logActivity(
        type === "lost" ? "lost_reported" : "found_reported",
        `${created.report_id} — ${created.title}`,
        displayName,
      );

      return { item: created, matches };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setResult(data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <h1 className="text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-2 text-muted-foreground">{copy.subtitle}</p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <Field label="Item name" htmlFor="title">
            <Input
              id="title"
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Black Wildcraft backpack"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="category">
              <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={copy.dateLabel} htmlFor="date">
              <Input
                id="date"
                type="date"
                required
                value={form.event_date}
                onChange={(e) => set("event_date", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              required
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the item and the circumstances."
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={copy.locationLabel} htmlFor="location">
              <Input
                id="location"
                required
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Central Library"
              />
            </Field>
            <Field label="Approximate area (shown publicly)" htmlFor="area">
              <Input
                id="area"
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder="e.g. North Campus"
              />
            </Field>
            <Field label="Approximate time" htmlFor="time">
              <Input
                id="time"
                value={form.event_time}
                onChange={(e) => set("event_time", e.target.value)}
                placeholder="e.g. around 2:30 PM"
              />
            </Field>
            <Field label="Colour" htmlFor="color">
              <Input id="color" value={form.color} onChange={(e) => set("color", e.target.value)} />
            </Field>
            <Field label="Brand" htmlFor="brand">
              <Input id="brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            </Field>
            {type === "lost" ? (
              <Field label="Reward (optional)" htmlFor="reward">
                <Input
                  id="reward"
                  value={form.reward}
                  onChange={(e) => set("reward", e.target.value)}
                  placeholder="e.g. ₹500"
                />
              </Field>
            ) : (
              <Field label="Where is the item now?" htmlFor="current">
                <Input
                  id="current"
                  value={form.current_location}
                  onChange={(e) => set("current_location", e.target.value)}
                  placeholder="e.g. Security desk, Block A"
                />
              </Field>
            )}
          </div>

          <Field label={copy.featuresLabel} htmlFor="features">
            <Textarea
              id="features"
              rows={2}
              value={form.unique_features}
              onChange={(e) => set("unique_features", e.target.value)}
              placeholder="Used only to verify the real owner — never shown publicly."
            />
          </Field>

          <Field label="Contact preference" htmlFor="contact">
            <Select
              value={form.contact_preference}
              onValueChange={(v) => set("contact_preference", v)}
            >
              <SelectTrigger id="contact">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_app">In-app messages only</SelectItem>
                <SelectItem value="email">Email after verification</SelectItem>
                <SelectItem value="phone">Phone after verification</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo (optional)</Label>
            <label
              htmlFor="photo"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground hover:bg-secondary/60"
            >
              <ImagePlus className="h-5 w-5" />
              {file ? file.name : "Upload a photo of the item"}
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {type === "found" && (
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">I'm willing to hand this item over</p>
                <p className="text-xs text-muted-foreground">
                  After the owner is verified by you or an admin.
                </p>
              </div>
              <Switch checked={handover} onCheckedChange={setHandover} />
            </div>
          )}

          <p className="flex items-start gap-2 rounded-xl bg-secondary/60 p-4 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            Your contact details and private features are never published. Only the approximate
            area appears on public listings.
          </p>

          <Button
            type="submit"
            variant={type === "lost" ? "lost" : "found"}
            size="lg"
            className="w-full"
            disabled={submit.isPending}
          >
            {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit report
          </Button>
        </form>
      </div>

      <Dialog open={Boolean(result)} onOpenChange={() => setResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Report submitted
            </DialogTitle>
            <DialogDescription>
              Your report ID is{" "}
              <span className="font-mono font-semibold text-foreground">
                {result?.item.report_id}
              </span>
              . Keep it handy when you collect the item.
            </DialogDescription>
          </DialogHeader>

          {result && result.matches.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                We already found {result.matches.length} potential match
                {result.matches.length === 1 ? "" : "es"}:
              </p>
              {result.matches.map((match) => (
                <Link
                  key={match.item.id}
                  to="/item/$id"
                  params={{ id: match.item.id }}
                  onClick={() => setResult(null)}
                  className="block rounded-xl border p-3 hover:bg-secondary/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="line-clamp-1 text-sm font-medium">{match.item.title}</span>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      {match.score}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {match.reasons.join(" · ")}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No matches yet — we'll notify you the moment a matching report appears.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="hero"
              className="flex-1"
              onClick={() => {
                setResult(null);
                navigate({ to: "/dashboard" });
              }}
            >
              Go to dashboard
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setResult(null);
                navigate({ to: "/browse" });
              }}
            >
              Browse items
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
