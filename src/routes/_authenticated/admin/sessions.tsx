import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions | Bright Steps Admin" },
      { name: "description", content: "Plan and record learning sessions at Bright Steps." },
      { property: "og:title", content: "Sessions | Bright Steps Admin" },
      { property: "og:description", content: "Plan and record learning sessions at Bright Steps." },
    ],
  }),
  component: () => <PlaceholderPage title="Sessions" />,
});