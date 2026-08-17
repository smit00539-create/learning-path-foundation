import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/curriculum/$toyId")({
  head: () => ({
    meta: [
      { title: "Toy subjects | Bright Steps Admin" },
      { name: "description", content: "Add subjects and difficulty-ordered books for this learning toy." },
      { property: "og:title", content: "Toy subjects | Bright Steps Admin" },
      { property: "og:description", content: "Add subjects and difficulty-ordered books for this learning toy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToyDetailPage,
});

interface Subject {
  id: string;
  name: string;
  sort_order: number;
}

function ToyDetailPage() {
  const { toyId } = Route.useParams();
  const qc = useQueryClient();
  const [subjectName, setSubjectName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: toy } = useQuery({
    queryKey: ["toy", toyId],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("toys")
        .select("id, name, brand, age_range")
        .eq("id", toyId)
        .maybeSingle();
      if (e) throw e;
      return data;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", toyId],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("subjects")
        .select("id, name, sort_order")
        .eq("toy_id", toyId)
        .order("sort_order")
        .order("created_at");
      if (e) throw e;
      return (data ?? []) as Subject[];
    },
  });

  const subjectIds = subjects.map((s) => s.id);
  const { data: bookCounts = {} } = useQuery({
    queryKey: ["book-counts", toyId, subjectIds.join(",")],
    enabled: subjectIds.length > 0,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("books")
        .select("id, subject_id")
        .in("subject_id", subjectIds);
      if (e) throw e;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) counts[row.subject_id] = (counts[row.subject_id] ?? 0) + 1;
      return counts;
    },
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("subjects").insert({
        toy_id: toyId,
        name: subjectName.trim(),
        sort_order: subjects.length,
      });
      if (e) throw e;
    },
    onSuccess: () => {
      setSubjectName("");
      setError(null);
      void qc.invalidateQueries({ queryKey: ["subjects", toyId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeSubject = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase.from("subjects").delete().eq("id", id);
      if (e) throw e;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subjects", toyId] });
      void qc.invalidateQueries({ queryKey: ["book-counts", toyId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const moveSubject = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const target = index + direction;
      const a = subjects[index];
      const b = subjects[target];
      if (!a || !b) return;
      const { error: e1 } = await supabase.from("subjects").update({ sort_order: target }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("subjects").update({ sort_order: index }).eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["subjects", toyId] }),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <section className="mx-auto max-w-4xl">
      <Link to="/admin/curriculum" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> All toys
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{toy?.name ?? "Toy"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {[toy?.brand, toy?.age_range].filter(Boolean).join(" · ") || "Subjects and books for this toy"}
      </p>

      <form
        className="mt-6 flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          addSubject.mutate();
        }}
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor="subject-name">New subject</Label>
          <Input
            id="subject-name"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Math, Logic, Pattern Recognition…"
            required
          />
        </div>
        <Button type="submit" disabled={addSubject.isPending || !subjectName.trim()}>
          <Plus className="h-4 w-4" /> Add subject
        </Button>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-6 space-y-5">
        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No subjects yet. Add one above to start building books.
          </div>
        ) : null}
        {subjects.map((subject, index) => (
          <div key={subject.id} className="flex items-center gap-2 rounded-2xl border bg-card p-4">
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${subject.name} up`}
                disabled={index === 0 || moveSubject.isPending}
                onClick={() => moveSubject.mutate({ index, direction: -1 })}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${subject.name} down`}
                disabled={index === subjects.length - 1 || moveSubject.isPending}
                onClick={() => moveSubject.mutate({ index, direction: 1 })}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            <Link
              to="/admin/curriculum/subject/$subjectId"
              params={{ subjectId: subject.id }}
              className="min-w-0 flex-1"
            >
              <p className="truncate font-semibold">{subject.name}</p>
              <p className="text-xs text-muted-foreground">{bookCounts[subject.id] ?? 0} book(s)</p>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${subject.name}`}
              onClick={() => {
                if (confirm(`Delete subject "${subject.name}" with all its books?`)) removeSubject.mutate(subject.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Link
              to="/admin/curriculum/subject/$subjectId"
              params={{ subjectId: subject.id }}
              aria-label={`Open ${subject.name}`}
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}