import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      const total = Math.max(1, Math.min(200, book?.total_pages ?? 14));
      const existing = new Set(pages.map((p) => p.page_number));
      const rows = Array.from({ length: total }, (_, i) => i + 1)
        .filter((n) => !existing.has(n))
        .map((n) => ({ book_id: bookId, page_number: n }));
      if (rows.length === 0) return;
      const { error: e } = await supabase.from("pages").insert(rows);
      if (e) throw e;
    },
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["pages", bookId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const subject = book?.subjects as { id?: string; name?: string; toy_id?: string } | null;
  const openPage = pages.find((p) => p.id === openPageId) ?? null;

  return (
    <section className="mx-auto max-w-3xl">
      {subject?.id ? (
        <Link
          to="/admin/curriculum/subject/$subjectId"
          params={{ subjectId: subject.id }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to books
        </Link>
      ) : (
        <Link to="/admin/curriculum" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> All toys
        </Link>
      )}

      <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{book?.name ?? "Book"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {subject?.name ?? "Pages and discussion questions"} · {book?.total_pages ?? 0} pages planned
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {pages.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed bg-card p-8 text-center">
          <p className="font-semibold">No pages yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create Page 1 to {book?.total_pages ?? 14} from this book&apos;s total pages.
          </p>
          <Button className="mt-4" onClick={() => generatePages.mutate()} disabled={generatePages.isPending}>
            <Sparkles className="h-4 w-4" /> Generate pages
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {pages.length} page(s) ·{" "}
              {new Set(questions.map((q) => q.page_id)).size} with questions
            </p>
            {pages.length < (book?.total_pages ?? 0) ? (
              <Button variant="secondary" size="sm" onClick={() => generatePages.mutate()}>
                <Sparkles className="h-4 w-4" /> Add missing pages
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {pages.map((page) => {
              const count = questions.filter((q) => q.page_id === page.id).length;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setOpenPageId(page.id)}
                  className={`relative rounded-xl border px-2 py-3 text-center transition-colors ${
                    count > 0 ? "border-primary/50 bg-primary/10" : "bg-card hover:bg-muted"
                  }`}
                >
                  {count > 0 ? (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                  <span className="block text-sm font-bold">{page.page_number}</span>
                  <span className={`block text-[11px] ${count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {count > 0 ? `${count} Q` : "no Q"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={openPage !== null} onOpenChange={(open) => !open && setOpenPageId(null)}>
        <DialogContent>
          {openPage ? (
            <QuestionEditor
              pageId={openPage.id}
              pageNumber={openPage.page_number}
              questions={questions.filter((q) => q.page_id === openPage.id)}
              onSaved={() => {
                setOpenPageId(null);
                void qc.invalidateQueries({ queryKey: ["page_questions", bookId] });
              }}
              onError={setError}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function QuestionEditor({
  pageId,
  pageNumber,
  questions,
  onSaved,
  onError,
}: {
  pageId: string;
  pageNumber: number;
  questions: Question[];
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [values, setValues] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);
    setValues([0, 1, 2].map((i) => sorted[i]?.question_text ?? ""));
  }, [pageId, questions]);

  const save = useMutation({
    mutationFn: async () => {
      const { error: delErr } = await supabase.from("page_questions").delete().eq("page_id", pageId);
      if (delErr) throw delErr;
      const rows = values
        .map((text, i) => ({ page_id: pageId, question_text: text.trim(), sort_order: i }))
        .filter((r) => r.question_text.length > 0);
      if (rows.length > 0) {
        const { error: e } = await supabase.from("page_questions").insert(rows);
        if (e) throw e;
      }
    },
    onSuccess: onSaved,
    onError: (e: Error) => onError(e.message),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Page {pageNumber} — discussion questions</DialogTitle>
        <DialogDescription>
          Question 1 is what parents see first. Questions 2 and 3 are optional.
        </DialogDescription>
      </DialogHeader>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Label htmlFor={`q-${i}`}>Question {i + 1}{i > 0 ? " (optional)" : ""}</Label>
            <Textarea
              id={`q-${i}`}
              rows={2}
              value={values[i] ?? ""}
              onChange={(e) =>
                setValues((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
              }
              placeholder={i === 0 ? "What was the trickiest match on this page?" : ""}
              required={i === 0}
            />
          </div>
        ))}
        <Button type="submit" disabled={save.isPending}>
          Save questions
        </Button>
      </form>
    </>
  );
}
