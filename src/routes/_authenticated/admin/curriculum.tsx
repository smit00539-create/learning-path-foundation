import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/curriculum")({
  head: () => ({
    meta: [
      { title: "Curriculum | Bright Steps Admin" },
      { name: "description", content: "Toy and book based curriculum planning for ages 3 to 12." },
      { property: "og:title", content: "Curriculum | Bright Steps Admin" },
      { property: "og:description", content: "Toy and book based curriculum planning for ages 3 to 12." },
    ],
  }),
  component: () => <PlaceholderPage title="Curriculum" />,
});