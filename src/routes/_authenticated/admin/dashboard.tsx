import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Bright Steps Admin" },
      { name: "description", content: "Staff dashboard for the Bright Steps learning center." },
      { property: "og:title", content: "Dashboard | Bright Steps Admin" },
      { property: "og:description", content: "Staff dashboard for the Bright Steps learning center." },
    ],
  }),
  component: () => <PlaceholderPage title="Dashboard" />,
});