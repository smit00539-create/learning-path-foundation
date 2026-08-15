import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/lib/use-profile";

export const Route = createFileRoute("/_authenticated/admin/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions | Bright Steps Admin" },
      { name: "description", content: "Plan and record learning sessions at Bright Steps." },
      { property: "og:title", content: "Sessions | Bright Steps Admin" },
      { property: "og:description", content: "Plan and record learning sessions at Bright Steps." },
    ],
  }),
  component: SessionsPage,
});

type Status = "completed" | "needed_help" | "struggled";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "completed", label: "Easy" },
  { value: "needed_help", label: "Needed help" },
  { value: "struggled", label: "Struggled" },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SessionsPage() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [batchId, setBatchId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("batches")
        .select("id, name, center_location")
        .order("name");
      if (e) throw e;
      return data ?? [];
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["session", batchId, today()],
    enabled: !!batchId,
    queryFn: async () => {
      const date = today();
      const { data: existing, error: e1 } = await supabase
        .from("sessions")
        .select("id")
        .eq("batch_id", batchId!)
        .eq("session_date", date)
        .maybeSingle();
      if (e1) throw e1;
      if (existing) return existing.id as string;
      const { data: created, error: e2 } = await supabase
        .from("sessions")
        .insert({ batch_id: batchId!, session_date: date, instructor_id: profile?.id ?? null })
        .select("id")
        .single();
      if (e2) throw e2;
      return created.id as string;
    },
  });
  const sessionId = sessionQuery.data ?? null;

  const { data: roster = [] } = useQuery({
    queryKey: ["roster", batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("children")
        .select("id, name")
        .eq("batch_id", batchId!)
        .order("name");
      if (e) throw e;
      return data ?? [];
    },
  });

  const { data: loggedChildIds = [] } = useQuery({
    queryKey: ["session-logged", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("session_page_logs")
        .select("child_id")
        .eq("session_id", sessionId!);
      if (e) throw e;
      return Array.from(new Set((data ?? []).map((r) => r.child_id as string)));
    },
  });

  if (!batchId) {
    return (
      <section className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Log a session</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick the batch you are teaching today.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {batches.map((b) => (
            <button
              key={b.id}
              onClick={() => setBatchId(b.id)}
              className="rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <p className="font-semibold">{b.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {b.center_location ?? "No location set"}
              </p>
            </button>
          ))}
          {batches.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground sm:col-span-2">
              Create a batch first.
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  const batch = batches.find((b) => b.id === batchId);

  if (childId && sessionId) {
    const child = roster.find((c) => c.id === childId);
    return (
      <ChildLogger
        key={childId}
        sessionId={sessionId}
        childId={childId}
        childName={child?.name ?? "Student"}
        onBack={() => setChildId(null)}
        onSaved={() => {
          setChildId(null);
          void qc.invalidateQueries({ queryKey: ["session-logged", sessionId] });
        }}
      />
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <button
        onClick={() => {
          setBatchId(null);
          setError(null);
        }}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All batches
      </button>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{batch?.name}</h1>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" /> {roster.length} students · session for {today()}
      </p>

      {sessionQuery.isError ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not open today's session.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-6 space-y-3">
        {roster.map((c) => {
          const logged = loggedChildIds.includes(c.id);
          return (
            <button
              key={c.id}
              disabled={!sessionId}
              onClick={() => setChildId(c.id)}
              className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                  logged ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {logged ? <Check className="h-5 w-5" /> : c.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {logged ? "Logged today" : "Tap to log today's pages"}
                </span>
              </span>
            </button>
          );
        })}
        {roster.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No students in this batch yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ChildLogger({
  sessionId,
  childId,
  childName,
  onBack,
  onSaved,
}: {
  sessionId: string;
  childId: string;
  childName: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Status>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: subjects = [] } = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("subjects")
        .select("id, name, sort_order, toys(name)")
        .order("sort_order");
      if (e) throw e;
      return data ?? [];
    },
  });

  const { data: books = [] } = useQuery({
    queryKey: ["subject-books", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("books")
        .select("id, name, sort_order, total_pages")
        .eq("subject_id", subjectId!)
        .order("sort_order");
      if (e) throw e;
      return data ?? [];
    },
  });

  // Last book this child worked on in this subject, to suggest the next one.
  const { data: lastBookId } = useQuery({
    queryKey: ["last-book", childId, subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("session_page_logs")
        .select("created_at, pages(book_id, books(subject_id))")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (e) throw e;
      const match = (data ?? []).find(
        (row) =>
          (row.pages as { books?: { subject_id?: string } } | null)?.books?.subject_id === subjectId,
      );
      return ((match?.pages as { book_id?: string } | null)?.book_id ?? null) as string | null;
    },
  });

  const suggestedBookId = useMemo(() => {
    if (!books.length) return null;
    if (!lastBookId) return books[0]!.id;
    const idx = books.findIndex((b) => b.id === lastBookId);
    return books[idx]?.id ?? books[0]!.id;
  }, [books, lastBookId]);

  const activeBookId = bookId ?? suggestedBookId;

  const { data: pages = [] } = useQuery({
    queryKey: ["book-pages", activeBookId],
    enabled: !!activeBookId,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("pages")
        .select("id, page_number")
        .eq("book_id", activeBookId!)
        .order("page_number");
      if (e) throw e;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(selected).map(([page_id, status]) => ({
        session_id: sessionId,
        child_id: childId,
        page_id,
        status,
        note: note.trim() || null,
      }));
      if (!rows.length) return;
      const { error: e } = await supabase
        .from("session_page_logs")
        .upsert(rows, { onConflict: "session_id,child_id,page_id" });
      if (e) throw e;
    },
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });

  const selectedCount = Object.keys(selected).length;

  return (
    <section className="mx-auto max-w-3xl pb-28">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Roster
      </button>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{childName}</h1>

      <p className="mt-6 text-sm font-semibold">Subject</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSubjectId(s.id);
              setBookId(null);
              setSelected({});
            }}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              subjectId === s.id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:border-primary"
            }`}
          >
            {s.name}
          </button>
        ))}
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add subjects in Curriculum first.</p>
        ) : null}
      </div>

      {subjectId ? (
        <>
          <p className="mt-6 text-sm font-semibold">Book</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {books.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBookId(b.id);
                  setSelected({});
                }}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  activeBookId === b.id
                    ? "border-primary bg-primary/10"
                    : "bg-card hover:border-primary"
                }`}
              >
                {b.name}
                {b.id === suggestedBookId && !bookId ? (
                  <span className="ml-2 text-xs text-primary">next up</span>
                ) : null}
              </button>
            ))}
            {books.length === 0 ? (
              <p className="text-sm text-muted-foreground">No books in this subject yet.</p>
            ) : null}
          </div>
        </>
      ) : null}

      {activeBookId ? (
        <>
          <p className="mt-6 text-sm font-semibold">Pages worked on today</p>
          <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-8">
            {pages.map((p) => {
              const isOn = !!selected[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    setSelected((prev) => {
                      const next = { ...prev };
                      if (next[p.id]) delete next[p.id];
                      else next[p.id] = "completed";
                      return next;
                    })
                  }
                  className={`aspect-square rounded-xl border text-sm font-semibold transition-colors ${
                    isOn
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:border-primary"
                  }`}
                >
                  {p.page_number}
                </button>
              );
            })}
            {pages.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">
                Generate pages for this book in Curriculum first.
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {selectedCount > 0 ? (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-semibold">How did each page go?</p>
          {pages
            .filter((p) => selected[p.id])
            .map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3"
              >
                <span className="w-16 text-sm font-semibold">Page {p.page_number}</span>
                <div className="flex flex-1 gap-1 rounded-xl bg-muted p-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelected((prev) => ({ ...prev, [p.id]: opt.value }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                        selected[p.id] === opt.value
                          ? "bg-card shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for the parent"
            className="mt-2"
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 p-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedCount} page{selectedCount === 1 ? "" : "s"} selected
          </span>
          <Button
            className="ml-auto"
            size="lg"
            disabled={selectedCount === 0 || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Save &amp; next child
          </Button>
        </div>
      </div>
    </section>
  );
}