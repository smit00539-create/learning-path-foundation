import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Bright Steps Admin" },
      { name: "description", content: "Progress reports for batches and students at Bright Steps." },
      { property: "og:title", content: "Reports | Bright Steps Admin" },
      { property: "og:description", content: "Progress reports for batches and students at Bright Steps." },
    ],
  }),
  component: () => <PlaceholderPage title="Reports" />,
});