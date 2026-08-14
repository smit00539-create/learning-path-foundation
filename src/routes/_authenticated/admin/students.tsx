import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      { title: "Students | Bright Steps Admin" },
      { name: "description", content: "Student records and enrolment for the Bright Steps center." },
      { property: "og:title", content: "Students | Bright Steps Admin" },
      { property: "og:description", content: "Student records and enrolment for the Bright Steps center." },
    ],
  }),
  component: () => <PlaceholderPage title="Students" />,
});