import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/batches")({
  head: () => ({
    meta: [
      { title: "Batches | Bright Steps Admin" },
      { name: "description", content: "Manage learning batches and age groups at Bright Steps." },
      { property: "og:title", content: "Batches | Bright Steps Admin" },
      { property: "og:description", content: "Manage learning batches and age groups at Bright Steps." },
    ],
  }),
  component: () => <PlaceholderPage title="Batches" />,
});