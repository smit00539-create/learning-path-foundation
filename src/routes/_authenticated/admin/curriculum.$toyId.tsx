import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
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
interface Book {
  id: string;
  subject_id: string;
  name: string;
  sort_order: number;
  total_pages: number;
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
  const { data: books = [] } = useQuery({
    queryKey: ["books", toyId, subjectIds.join(",")],
    enabled: subjectIds.length > 0,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("books")
        .select("id, subject_id, name, sort_order, total_pages")
        .in("subject_id", subjectIds)
        .order("sort_order")
        .order("created_at");
      if (e) throw e;
      return (data ?? []) as Book[];
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
      void qc.invalidateQueries({ queryKey: ["books", toyId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const invalidateBooks = () => {
    void qc.invalidateQueries({ queryKey: ["books", toyId] });
  };

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
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            books={books.filter((b) => b.subject_id === subject.id)}
            onChanged={invalidateBooks}
            onDeleteSubject={() => {
              if (confirm(`Delete subject "${subject.name}" with all its books?`)) removeSubject.mutate(subject.id);
            }}
            onError={setError}
          />
        ))}
      </div>
    </section>
  );
}

function SubjectCard({
  subject,
  books,
  onChanged,
  onDeleteSubject,
  onError,
}: {
  subject: Subject;
  books: Book[];
  onChanged: () => void;
  onDeleteSubject: () => void;
  onError: (message: string) => void;
}) {
  const [bookName, setBookName] = useState("");
  const [count, setCount] = useState("1");
  const [pages, setPages] = useState("14");

  const addBooks = useMutation({
    mutationFn: async () => {
      const howMany = Math.max(1, Math.min(50, Number(count) || 1));
      const totalPages = Math.max(1, Math.min(200, Number(pages) || 14));
      const base = bookName.trim() || "Book";
      const rows = Array.from({ length: howMany }, (_, i) => ({
        subject_id: subject.id,
        name: howMany === 1 ? base : `${base} ${books.length + i + 1}`,
        sort_order: books.length + i,
        total_pages: totalPages,
      }));
      const { error: e } = await supabase.from("books").insert(rows);
      if (e) throw e;
    },
    onSuccess: () => {
      setBookName("");
      setCount("1");
      onChanged();
    },
    onError: (e: Error) => onError(e.message),
  });

  const removeBook = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase.from("books").delete().eq("id", id);
      if (e) throw e;
    },
    onSuccess: onChanged,
    onError: (e: Error) => onError(e.message),
  });

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{subject.name}</h2>
          <p className="text-xs text-muted-foreground">{books.length} book(s)</p>
        </div>
        <Button variant="ghost" size="icon" aria-label={`Delete ${subject.name}`} onClick={onDeleteSubject}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {books.map((book) => (
          <div key={book.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2">
            <Link
              to="/admin/curriculum/book/$bookId"
              params={{ bookId: book.id }}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-sm font-semibold">{book.name}</p>
              <p className="text-xs text-muted-foreground">{book.total_pages} pages</p>
            </Link>
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
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        ))}
      </div>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          addBooks.mutate();
        }}
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`book-name-${subject.id}`}>Book name</Label>
          <Input
            id={`book-name-${subject.id}`}
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            placeholder="Book"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`book-count-${subject.id}`}>How many?</Label>
          <Input
            id={`book-count-${subject.id}`}
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`book-pages-${subject.id}`}>Pages each</Label>
          <Input
            id={`book-pages-${subject.id}`}
            type="number"
            min={1}
            max={200}
            value={pages}
            onChange={(e) => setPages(e.target.value)}
          />
        </div>
        <div className="sm:col-span-4">
          <Button type="submit" variant="secondary" disabled={addBooks.isPending}>
            <Plus className="h-4 w-4" /> Add book(s)
          </Button>
        </div>
      </form>
    </div>
  );
}