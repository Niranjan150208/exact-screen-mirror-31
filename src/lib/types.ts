export type ItemType = "lost" | "found";
export type ItemStatus = "active" | "under_review" | "recovered" | "removed";
export type ClaimStatus = "pending" | "under_review" | "verified" | "rejected" | "recovered";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Item {
  id: string;
  report_id: string;
  type: ItemType;
  title: string;
  category_id: string | null;
  description: string;
  color: string | null;
  brand: string | null;
  unique_features: string | null;
  event_date: string;
  event_time: string | null;
  location: string;
  area: string | null;
  photo_url: string | null;
  reward: string | null;
  contact_preference: string | null;
  current_location: string | null;
  willing_to_handover: boolean | null;
  status: ItemStatus;
  reporter_id: string | null;
  reporter_name: string | null;
  flagged: boolean;
  recovered_at: string | null;
  created_at: string;
}

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  claimant_name: string | null;
  identifying_details: string;
  answers: Record<string, unknown>;
  status: ClaimStatus;
  reviewer_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  kind: string;
  link: string | null;
  read: boolean;
  created_at: string;
}
