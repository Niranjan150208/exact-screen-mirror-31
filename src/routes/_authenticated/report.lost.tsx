import { createFileRoute } from "@tanstack/react-router";
import { ReportForm } from "@/components/report-form";

export const Route = createFileRoute("/_authenticated/report/lost")({
  head: () => ({
    meta: [
      { title: "Report a lost item — FindBack" },
      { name: "description", content: "Describe what you lost and FindBack will search found reports for matches." },
      { property: "og:title", content: "Report a lost item — FindBack" },
      { property: "og:description", content: "Describe what you lost and get matched with found reports." },
    ],
  }),
  component: () => <ReportForm type="lost" />,
});
