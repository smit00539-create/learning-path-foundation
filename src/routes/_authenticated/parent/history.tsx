import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/parent/history")({
  head: () => ({
    meta: [
      { title: "History | Bright Steps" },
      { name: "description", content: "Review past sessions and activities at Bright Steps." },
      { property: "og:title", content: "History | Bright Steps" },
      { property: "og:description", content: "Review past sessions and activities at Bright Steps." },
    ],
  }),
  component: () => <PlaceholderPage title="History" />,
});