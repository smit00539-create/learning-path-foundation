import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/batches")({
  head: () => ({
    meta: [
      { title: "Batches | Bright Steps Admin" },
      { name: "description", content: "Manage learning batches and age groups at Bright Steps." },
      { property: "og:title", content: "Batches | Bright Steps Admin" },
      { property: "og:description", content: "Manage learning batches and age groups at Bright Steps." },
    ],
  }),
  component: BatchesPage,
});

interface Batch {
  id: string;
  name: string;
  center_location: string | null;
  instructor_id: string | null;
}

function BatchesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", center_location: "", instructor_id: "" });
  const [error, setError] = useState<string | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("batches")
        .select("id, name, center_location, instructor_id")
        .order("created_at");
      if (e) throw e;
      return (data ?? []) as Batch[];
    },
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["instructor", "admin"]);
      if (e) throw e;
      return data ?? [];
    },
  });

  const saveBatch = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("batches").insert({
        name: form.name.trim(),
        center_location: form.center_location.trim() || null,
        instructor_id: form.instructor_id || null,
      });
      if (e) throw e;
    },
    onSuccess: () => {
      setForm({ name: "", center_location: "", instructor_id: "" });
      setError(null);
      void qc.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeBatch = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase.from("batches").delete().eq("id", id);
      if (e) throw e;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["batches"] }),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Batches</h1>
      <p className="mt-1 text-sm text-muted-foreground">Groups of students that meet together at a center.</p>

      <form
        className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          saveBatch.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="batch-name">Batch name</Label>
          <Input
            id="batch-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Tue 5 PM — Juniors"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-location">Center location</Label>
          <Input
            id="batch-location"
            value={form.center_location}
            onChange={(e) => setForm({ ...form, center_location: e.target.value })}
            placeholder="Main center"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-instructor">Instructor</Label>
          <select
            id="batch-instructor"
            value={form.instructor_id}
            onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Unassigned</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.full_name ?? "Unnamed staff"}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={saveBatch.isPending || !form.name.trim()}>
            <Plus className="h-4 w-4" /> Add batch
          </Button>
        </div>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-6 space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading batches…</p> : null}
        {!isLoading && batches.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No batches yet.
          </div>
        ) : null}
        {batches.map((batch) => (
          <div key={batch.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{batch.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  batch.center_location,
                  instructors.find((i) => i.id === batch.instructor_id)?.full_name,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No location or instructor set"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${batch.name}`}
              onClick={() => {
                if (confirm(`Delete batch "${batch.name}"?`)) removeBatch.mutate(batch.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}