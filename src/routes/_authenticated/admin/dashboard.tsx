import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Users, Layers, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Bright Steps Admin" },
      { name: "description", content: "Staff dashboard for the Bright Steps learning center." },
      { property: "og:title", content: "Dashboard | Bright Steps Admin" },
      { property: "og:description", content: "Staff dashboard for the Bright Steps learning center." },
    ],
  }),
  component: DashboardPage,
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [batches, children, toys, sessions] = await Promise.all([
        supabase.from("batches").select("id", { count: "exact", head: true }),
        supabase.from("children").select("id", { count: "exact", head: true }),
        supabase.from("toys").select("id", { count: "exact", head: true }),
        supabase
          .from("sessions")
          .select("id, batches(name)")
          .eq("session_date", todayISO()),
      ]);
      return {
        batches: batches.count ?? 0,
        children: children.count ?? 0,
        toys: toys.count ?? 0,
        todaySessions: sessions.data ?? [],
      };
    },
  });

  const cards = [
    { label: "Batches", value: stats?.batches ?? 0, icon: Layers },
    { label: "Students", value: stats?.children ?? 0, icon: Users },
    { label: "Toys", value: stats?.toys ?? 0, icon: BookOpen },
    { label: "Sessions today", value: stats?.todaySessions.length ?? 0, icon: ClipboardCheck },
  ];

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Today at a glance.</p>

      <div className="mt-6 rounded-2xl border bg-primary/5 p-5">
        <p className="font-semibold">Ready to teach?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Log today's pages for each student in a batch.
        </p>
        <Button asChild className="mt-4" size="lg">
          <Link to="/admin/sessions">
            <ClipboardCheck className="mr-2 h-4 w-4" /> Log session
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-4">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {stats?.todaySessions.length ? (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Today's sessions</h2>
          <div className="mt-3 space-y-2">
            {stats.todaySessions.map((s) => (
              <div key={s.id} className="rounded-2xl border bg-card p-4 text-sm font-medium">
                {(s.batches as { name?: string } | null)?.name ?? "Batch"}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}