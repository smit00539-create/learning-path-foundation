import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { homePathForRole, type AppRole } from "@/lib/use-profile";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bright Steps Learning Center" },
      {
        name: "description",
        content:
          "Progress tracking for a kids' learning center using educational toys and books, for ages 3 to 12.",
      },
      { property: "og:title", content: "Bright Steps Learning Center" },
      {
        property: "og:description",
        content: "Progress tracking for parents and instructors at a kids' learning center.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile) throw redirect({ to: "/auth" });
    throw redirect({ to: homePathForRole(profile.role as AppRole) });
  },
  component: () => null,
});
