import { createFileRoute } from "@tanstack/react-router";
import { ReportForm } from "@/components/report-form";

export const Route = createFileRoute("/_authenticated/report/found")({
  head: () => ({
    meta: [
      { title: "Report a found item — FindBack" },
      { name: "description", content: "Found something? Post it on FindBack and help the owner get it back safely." },
      { property: "og:title", content: "Report a found item — FindBack" },
      { property: "og:description", content: "Post a found item and help the owner get it back safely." },
    ],
  }),
  component: () => <ReportForm type="found" />,
});
