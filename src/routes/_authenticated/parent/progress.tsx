import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/parent/progress")({
  head: () => ({
    meta: [
      { title: "Progress | Bright Steps" },
      { name: "description", content: "Track your child's learning milestones at Bright Steps." },
      { property: "og:title", content: "Progress | Bright Steps" },
      { property: "og:description", content: "Track your child's learning milestones at Bright Steps." },
    ],
  }),
  component: () => <PlaceholderPage title="Progress" />,
});