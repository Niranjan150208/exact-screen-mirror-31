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
import type { ClaimStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — FindBack" },
      { name: "description", content: "Track your lost and found reports, potential matches, claims and recoveries." },
      { property: "og:title", content: "Your dashboard — FindBack" },
      { property: "og:description", content: "Track your reports, matches, claims and recoveries." },
    ],
  }),
  component: Dashboard;
});

function Dashboard() {
  return null;
}
