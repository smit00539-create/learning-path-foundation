import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/curriculum/book/$bookId")({
  head: () => ({
    meta: [
      { title: "Book pages | Bright Steps Admin" },
      { name: "description", content: "Generate book pages and write the discussion questions parents get at home." },
      { property: "og:title", content: "Book pages | Bright Steps Admin" },
      { property: "og:description", content: "Generate book pages and write the discussion questions parents get at home." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookDetailPage,
});

interface Page {
  id: string;
  page_number: number;
}
interface Question {
  id: string;
  page_id: string;
  question_text: string;
  sort_order: number;
}

function BookDetailPage() {
  const { bookId } = Route.useParams();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [openPageId, setOpenPageId] = useState<string | null>(null);

  const { data: book } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("books")
        .select("id, name, total_pages, subject_id, subjects(id, name, toy_id)")
        .eq("id", bookId)
        .maybeSingle();
      if (e) throw e;
      return data;
    },
  });

  const [totalPages, setTotalPages] = useState<string>("");
  const effectiveTotal = totalPages !== "" ? totalPages : String(book?.total_pages ?? 14);

  const { data: pages = [] } = useQuery({
    queryKey: ["pages", bookId],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("pages")
        .select("id, page_number")
        .eq("book_id", bookId)
        .order("page_number");
      if (e) throw e;
      return (data ?? []) as Page[];
    },
  });

  const pageIds = pages.map((p) => p.id);
  const { data: questions = [] } = useQuery({
    queryKey: ["page_questions", bookId, pageIds.join(",")],
    enabled: pageIds.length > 0,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("page_questions")
        .select("id, page_id, question_text, sort_order")
        .in("page_id", pageIds)
        .order("sort_order");
      if (e) throw e;
      return (data ?? []) as Question[];
    },
  });

  const generatePages = useMutation({
    mutationFn: async () => {
      const total = Math.max(1, Math.min(200, Number(effectiveTotal) || 14));
      const { error: updateError } = await supabase
        .from("books")
        .update({ total_pages: total })
        .eq("id", bookId);
      if (updateError) throw updateError;
      const existing = new Set(pages.map((p) => p.page_number));
      const rows = Array.from({ length: total }, (_, i) => i + 1)
        .filter((n) => !existing.has(n))
        .map((n) => ({ book_id: bookId, page_number: n }));
      if (rows.length > 0) {
        const { error: e } = await supabase.from("pages").insert(rows);
        if (e) throw e;
      }
    },
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["pages", bookId] });
      void qc.invalidateQueries({ queryKey: ["book", bookId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const toyId = (book?.subjects as { toy_id?: string } | null)?.toy_id;

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

      <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{book?.name ?? "Book"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {(book?.subjects as { name?: string } | null)?.name ?? "Pages and discussion questions"}
      </p>

      <form
        className="mt-6 flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          generatePages.mutate();
        }}
      >
        <div className="space-y-2 sm:w-40">
          <Label htmlFor="total-pages">Total pages</Label>
          <Input
            id="total-pages"
            type="number"
            min={1}
            max={200}
            value={effectiveTotal}
            onChange={(e) => setTotalPages(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={generatePages.isPending}>
          Generate pages
        </Button>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {pages.length} page(s) created. Existing pages are kept.
        </p>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {pages.map((page) => {
          const count = questions.filter((q) => q.page_id === page.id).length;
          const active = openPageId === page.id;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => setOpenPageId(active ? null : page.id)}
              className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                active ? "border-primary bg-primary/10" : "bg-card hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-bold">{page.page_number}</span>
              <span className={`block text-[11px] ${count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {count > 0 ? `${count} Q` : "no Q"}
              </span>
            </button>
          );
        })}
      </div>

      {openPageId ? (
        <PageQuestions
          pageId={openPageId}
          pageNumber={pages.find((p) => p.id === openPageId)?.page_number ?? 0}
          questions={questions.filter((q) => q.page_id === openPageId)}
          onChanged={() => void qc.invalidateQueries({ queryKey: ["page_questions", bookId] })}
          onError={setError}
        />
      ) : pages.length > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Tap a page to add its discussion questions.</p>
      ) : null}
    </section>
  );
}

function PageQuestions({
  pageId,
  pageNumber,
  questions,
  onChanged,
  onError,
}: {
  pageId: string;
  pageNumber: number;
  questions: Question[];
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState("");

  const addQuestion = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("page_questions").insert({
        page_id: pageId,
        question_text: text.trim(),
        sort_order: questions.length,
      });
      if (e) throw e;
    },
    onSuccess: () => {
      setText("");
      onChanged();
    },
    onError: (e: Error) => onError(e.message),
  });

  const removeQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase.from("page_questions").delete().eq("id", id);
      if (e) throw e;
    },
    onSuccess: onChanged,
    onError: (e: Error) => onError(e.message),
  });

  return (
    <div className="mt-6 rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-bold">Page {pageNumber} — discussion questions</h2>
      <p className="text-xs text-muted-foreground">Add 1–3 questions. Pages with none fall back to a generic question.</p>

      <ul className="mt-4 space-y-2">
        {questions.map((q) => (
          <li key={q.id} className="flex items-start gap-3 rounded-xl bg-muted/60 px-3 py-2">
            <p className="flex-1 text-sm">{q.question_text}</p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete question"
              onClick={() => removeQuestion.mutate(q.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          addQuestion.mutate();
        }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What was the trickiest match on this page?"
          rows={2}
          required
        />
        <Button type="submit" variant="secondary" disabled={addQuestion.isPending || questions.length >= 3 || !text.trim()}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
        {questions.length >= 3 ? (
          <p className="text-xs text-muted-foreground">Maximum of 3 questions per page.</p>
        ) : null}
      </form>
    </div>
  );
}