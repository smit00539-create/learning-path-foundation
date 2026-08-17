import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Layers, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/curriculum/subject/$subjectId")({
  head: () => ({
    meta: [
      { title: "Subject books | Bright Steps Admin" },
      { name: "description", content: "Add and order the difficulty-graded books that belong to this subject." },
      { property: "og:title", content: "Subject books | Bright Steps Admin" },
      { property: "og:description", content: "Add and order the difficulty-graded books that belong to this subject." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubjectDetailPage,
});

interface Book {
  id: string;
  name: string;
  sort_order: number;
  total_pages: number;
}

function SubjectDetailPage() {
  const { subjectId } = Route.useParams();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", total_pages: "14", sort_order: "" });
  const [bulk, setBulk] = useState({ count: "10", total_pages: "14" });

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("subjects")
        .select("id, name, toy_id, toys(name)")
        .eq("id", subjectId)
        .maybeSingle();
      if (e) throw e;
      return data;
    },
  });

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books", subjectId],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("books")
        .select("id, name, sort_order, total_pages")
        .eq("subject_id", subjectId)
        .order("sort_order")
        .order("created_at");
      if (e) throw e;
      return (data ?? []) as Book[];
    },
  });

  const nextSort = books.length > 0 ? Math.max(...books.map((b) => b.sort_order)) + 1 : 1;
  const sortValue = form.sort_order !== "" ? form.sort_order : String(nextSort);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["books", subjectId] });
    void qc.invalidateQueries({ queryKey: ["book-counts"] });
  };

  const addBook = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("books").insert({
        subject_id: subjectId,
        name: form.name.trim(),
        total_pages: Math.max(1, Math.min(200, Number(form.total_pages) || 14)),
        sort_order: Number(sortValue) || nextSort,
      });
      if (e) throw e;
    },
    onSuccess: () => {
      setForm({ name: "", total_pages: "14", sort_order: "" });
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const bulkAdd = useMutation({
    mutationFn: async () => {
      const howMany = Math.max(1, Math.min(50, Number(bulk.count) || 1));
      const totalPages = Math.max(1, Math.min(200, Number(bulk.total_pages) || 14));
      const rows = Array.from({ length: howMany }, (_, i) => ({
        subject_id: subjectId,
        name: `Book ${i + 1}`,
        sort_order: i + 1,
        total_pages: totalPages,
      }));
      const { error: e } = await supabase.from("books").insert(rows);
      if (e) throw e;
    },
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const renameBook = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error: e } = await supabase.from("books").update({ name }).eq("id", id);
      if (e) throw e;
    },
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const removeBook = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase.from("books").delete().eq("id", id);
      if (e) throw e;
    },
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const toyId = (subject as { toy_id?: string } | null)?.toy_id;

  return (
    <section className="mx-auto max-w-3xl">
      {toyId ? (
        <Link
          to="/admin/curriculum/$toyId"
          params={{ toyId }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to subjects
        </Link>
      ) : (
        <Link to="/admin/curriculum" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> All toys
        </Link>
      )}

      <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{subject?.name ?? "Subject"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {(subject?.toys as { name?: string } | null)?.name ?? "Books in difficulty order"}
      </p>

      <div className="mt-6 space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading books…</p> : null}
        {!isLoading && books.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No books yet. Add one below, or bulk-create empty book slots.
          </div>
        ) : null}
        {books.map((book) => (
          <div key={book.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-sm font-bold">
              {book.sort_order}
            </span>
            <div className="min-w-0 flex-1">
              <Input
                aria-label={`Rename ${book.name}`}
                defaultValue={book.name}
                className="h-9 border-transparent bg-transparent px-1 font-semibold shadow-none focus-visible:border-input"
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== book.name) renameBook.mutate({ id: book.id, name: value });
                }}
              />
              <p className="px-1 text-xs text-muted-foreground">{book.total_pages} pages</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${book.name}`}
              onClick={() => {
                if (confirm(`Delete "${book.name}"?`)) removeBook.mutate(book.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Link
              to="/admin/curriculum/book/$bookId"
              params={{ bookId: book.id }}
              aria-label={`Open ${book.name}`}
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <p className="font-semibold">Add a book</p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            addBook.mutate();
          }}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="book-name">Name</Label>
            <Input
              id="book-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Shapes & Sizes"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-pages">Total pages</Label>
            <Input
              id="book-pages"
              type="number"
              min={1}
              max={200}
              value={form.total_pages}
              onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-sort">Sort order</Label>
            <Input
              id="book-sort"
              type="number"
              min={1}
              value={sortValue}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={addBook.isPending || !form.name.trim()}>
              <Plus className="h-4 w-4" /> Add book
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-5">
        <p className="font-semibold">Bulk add books</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates empty slots named “Book 1” … “Book N”. Rename them any time above.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-3 sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            bulkAdd.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="bulk-count">How many books?</Label>
            <Input
              id="bulk-count"
              type="number"
              min={1}
              max={50}
              value={bulk.count}
              onChange={(e) => setBulk({ ...bulk, count: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-pages">Pages each</Label>
            <Input
              id="bulk-pages"
              type="number"
              min={1}
              max={200}
              value={bulk.total_pages}
              onChange={(e) => setBulk({ ...bulk, total_pages: e.target.value })}
            />
          </div>
          <div>
            <Button type="submit" variant="secondary" disabled={bulkAdd.isPending || books.length > 0}>
              <Layers className="h-4 w-4" /> Bulk add
            </Button>
          </div>
        </form>
        {books.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Bulk add is available while the subject has no books yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}