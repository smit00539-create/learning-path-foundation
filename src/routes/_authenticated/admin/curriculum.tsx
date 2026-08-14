import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/curriculum")({
  head: () => ({
    meta: [
      { title: "Curriculum | Bright Steps Admin" },
      { name: "description", content: "Manage learning toys, subjects, books, pages and discussion questions." },
      { property: "og:title", content: "Curriculum | Bright Steps Admin" },
      { property: "og:description", content: "Manage learning toys, subjects, books, pages and discussion questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToysPage,
});

interface Toy {
  id: string;
  name: string;
  brand: string | null;
  age_range: string | null;
  image_url: string | null;
}

function ToysPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", brand: "", age_range: "", image_url: "" });
  const [error, setError] = useState<string | null>(null);

  const { data: toys = [], isLoading } = useQuery({
    queryKey: ["toys"],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("toys")
        .select("id, name, brand, age_range, image_url")
        .order("sort_order")
        .order("created_at");
      if (e) throw e;
      return (data ?? []) as Toy[];
    },
  });

  const addToy = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("toys").insert({
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        age_range: form.age_range.trim() || null,
        image_url: form.image_url.trim() || null,
      });
      if (e) throw e;
    },
    onSuccess: () => {
      setForm({ name: "", brand: "", age_range: "", image_url: "" });
      setError(null);
      void qc.invalidateQueries({ queryKey: ["toys"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeToy = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase.from("toys").delete().eq("id", id);
      if (e) throw e;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["toys"] }),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Curriculum</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start with a toy, then add its subjects, books, pages and discussion questions.
      </p>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <p className="font-semibold">Add a toy</p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            addToy.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="toy-name">Toy name</Label>
            <Input
              id="toy-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Logico Piccolo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toy-brand">Brand</Label>
            <Input
              id="toy-brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Finken"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toy-age">Age range</Label>
            <Input
              id="toy-age"
              value={form.age_range}
              onChange={(e) => setForm({ ...form, age_range: e.target.value })}
              placeholder="3-6 years"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toy-image">Image URL</Label>
            <Input
              id="toy-image"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={addToy.isPending || !form.name.trim()}>
              <Plus className="h-4 w-4" /> Add toy
            </Button>
          </div>
        </form>
        {error ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading toys…</p> : null}
        {!isLoading && toys.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No toys yet. Add your first toy above.
          </div>
        ) : null}
        {toys.map((toy) => (
          <div key={toy.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            {toy.image_url ? (
              <img
                src={toy.image_url}
                alt={`${toy.name} learning toy`}
                loading="lazy"
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-sm font-bold">
                {toy.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <Link to="/admin/curriculum/$toyId" params={{ toyId: toy.id }} className="min-w-0 flex-1">
              <p className="truncate font-semibold">{toy.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[toy.brand, toy.age_range].filter(Boolean).join(" · ") || "No details"}
              </p>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${toy.name}`}
              onClick={() => {
                if (confirm(`Delete "${toy.name}" and everything inside it?`)) removeToy.mutate(toy.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Link to="/admin/curriculum/$toyId" params={{ toyId: toy.id }} aria-label={`Open ${toy.name}`}>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}