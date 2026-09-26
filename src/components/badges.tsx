import { cn } from "@/lib/utils";
import type { ClaimStatus, ItemStatus, ItemType } from "@/lib/types";

export function TypeBadge({ type, className }: { type: ItemType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-soft",
        type === "lost" ? "bg-lost text-lost-foreground" : "bg-found text-found-foreground",
        className,
      )}
    >
      {type === "lost" ? "Lost" : "Found"}
    </span>
  );
}

const STATUS_LABEL: Record<ItemStatus | ClaimStatus, string> = {
  active: "Active",
  under_review: "Under review",
  recovered: "Recovered",
  removed: "Removed",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

export function StatusPill({
  status,
  className,
}: {
  status: ItemStatus | ClaimStatus;
  className?: string;
}) {
  const tone =
    status === "recovered" || status === "verified"
      ? "bg-success/15 text-success"
      : status === "rejected" || status === "removed"
        ? "bg-destructive/15 text-destructive"
        : status === "under_review" || status === "pending"
          ? "bg-warning/20 text-warning-foreground"
          : "bg-primary/12 text-primary";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone,
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
