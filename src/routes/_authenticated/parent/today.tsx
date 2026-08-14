import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/parent/today")({
  head: () => ({
    meta: [
      { title: "Today | Bright Steps" },
      { name: "description", content: "See what your child is learning today at Bright Steps." },
      { property: "og:title", content: "Today | Bright Steps" },
      { property: "og:description", content: "See what your child is learning today at Bright Steps." },
    ],
  }),
  component: () => <PlaceholderPage title="Today" />,
});