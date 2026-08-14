import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudentWithParent } from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      { title: "Students | Bright Steps Admin" },
      { name: "description", content: "Student records and enrolment for the Bright Steps center." },
      { property: "og:title", content: "Students | Bright Steps Admin" },
      { property: "og:description", content: "Student records and enrolment for the Bright Steps center." },
    ],
  }),
  component: StudentsPage,
});

interface Child {
  id: string;
  name: string;
  dob: string | null;
  batch_id: string | null;
  parent_id: string | null;
}

interface Created {
  childName: string;
  parentPhone: string;
  password: string | null;
  createdNewAccount: boolean;
}

function StudentsPage() {
  const qc = useQueryClient();
  const addStudent = useServerFn(createStudentWithParent);
  const [form, setForm] = useState({ childName: "", dob: "", batchId: "", parentName: "", parentPhone: "" });
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data, error: e } = await supabase.from("batches").select("id, name").order("created_at");
      if (e) throw e;
      return data ?? [];
    },
  });

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("children")
        .select("id, name, dob, batch_id, parent_id")
        .order("created_at", { ascending: false });
      if (e) throw e;
      return (data ?? []) as Child[];
    },
  });

  const { data: parents = [] } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("role", "parent");
      if (e) throw e;
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () =>
      addStudent({
        data: {
          childName: form.childName.trim(),
          dob: form.dob || null,
          batchId: form.batchId || null,
          parentName: form.parentName.trim(),
          parentPhone: form.parentPhone.trim(),
        },
      }),
    onSuccess: (result) => {
      setError(null);
      setCreated(result);
      setForm({ childName: "", dob: "", batchId: "", parentName: "", parentPhone: "" });
      void qc.invalidateQueries({ queryKey: ["children"] });
      void qc.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const shareText = created
    ? created.password
      ? `Hi! ${created.childName}'s progress is now on the Bright Steps parent app.\nLogin (phone): ${created.parentPhone}\nPassword: ${created.password}`
      : `Hi! ${created.childName} has been added to your existing Bright Steps parent account (${created.parentPhone}).`
    : "";
  const waHref = created
    ? `https://wa.me/${created.parentPhone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(shareText)}`
    : "#";

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Students</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Adding a student creates the parent login automatically — no self signup.
      </p>

      <form
        className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="child-name">Child name</Label>
          <Input
            id="child-name"
            value={form.childName}
            onChange={(e) => setForm({ ...form, childName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="child-dob">Date of birth</Label>
          <Input
            id="child-dob"
            type="date"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="child-batch">Batch</Label>
          <select
            id="child-batch"
            value={form.batchId}
            onChange={(e) => setForm({ ...form, batchId: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Unassigned</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="parent-name">Parent name</Label>
          <Input
            id="parent-name"
            value={form.parentName}
            onChange={(e) => setForm({ ...form, parentName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="parent-phone">Parent phone (this is their login)</Label>
          <Input
            id="parent-phone"
            type="tel"
            inputMode="tel"
            value={form.parentPhone}
            onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
            placeholder="+911234567890"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={submit.isPending}>
            <Plus className="h-4 w-4" /> {submit.isPending ? "Adding…" : "Add student"}
          </Button>
        </div>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {created ? (
        <div className="mt-4 rounded-2xl border bg-card p-5">
          <p className="font-semibold">{created.childName} added</p>
          <p className="mt-1 text-sm text-muted-foreground">Login: {created.parentPhone}</p>
          {created.password ? (
            <p className="text-sm text-muted-foreground">
              Password: <span className="font-mono font-semibold text-foreground">{created.password}</span> — shown
              once, share it now.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Linked to the existing parent account for this number.</p>
          )}
          <Button asChild className="mt-4">
            <a href={waHref} target="_blank" rel="noreferrer">
              <Share2 className="h-4 w-4" /> Share via WhatsApp
            </a>
          </Button>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading students…</p> : null}
        {!isLoading && children.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No students enrolled yet.
          </div>
        ) : null}
        {children.map((child) => (
          <div key={child.id} className="rounded-2xl border bg-card p-4">
            <p className="font-semibold">{child.name}</p>
            <p className="text-xs text-muted-foreground">
              {[
                batches.find((b) => b.id === child.batch_id)?.name ?? "No batch",
                parents.find((p) => p.id === child.parent_id)?.full_name ?? "No parent linked",
                parents.find((p) => p.id === child.parent_id)?.phone,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}