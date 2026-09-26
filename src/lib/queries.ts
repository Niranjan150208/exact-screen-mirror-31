import { supabase } from "@/integrations/supabase/client";
import type { AppNotification, Category, Claim, Item } from "./types";

export const itemsQuery = {
  queryKey: ["items"],
  queryFn: async (): Promise<Item[]> => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .neq("status", "removed")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Item[];
  },
};

export const categoriesQuery = {
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as unknown as Category[];
  },
};

export function claimsQuery(enabled: boolean) {
  return {
    queryKey: ["claims"],
    enabled,
    queryFn: async (): Promise<Claim[]> => {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Claim[];
    },
  };
}

export function notificationsQuery(userId: string | undefined) {
  return {
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as AppNotification[];
    },
  };
}

export async function notify(input: {
  userId: string;
  title: string;
  body?: string | null;
  kind?: string;
  link?: string;
}) {
  await supabase.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body ?? null,
    kind: input.kind ?? "info",
    link: input.link ?? null,
  });
}

export async function logActivity(action: string, detail: string, actorName?: string | null) {
  await supabase.from("activity_logs").insert({ action, detail, actor_name: actorName ?? null });
}
