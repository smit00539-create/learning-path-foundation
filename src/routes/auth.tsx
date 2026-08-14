import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { homePathForRole, type AppRole } from "@/lib/use-profile";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | Bright Steps Learning Center" },
      {
        name: "description",
        content:
          "Sign in to Bright Steps to follow your child's learning progress or manage batches, students and sessions.",
      },
      { property: "og:title", content: "Sign in | Bright Steps Learning Center" },
      {
        property: "og:description",
        content: "Secure sign in for parents and instructors at Bright Steps Learning Center.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const credentials =
        mode === "email"
          ? { email: identifier.trim(), password }
          : { phone: identifier.trim(), password };
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword(credentials);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      const userId = data.user?.id;
      if (!userId) {
        setError("Could not start your session. Please try again.");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (!profile) {
        await supabase.auth.signOut();
        setError("No profile is set up for this account yet. Please contact the center.");
        return;
      }
      navigate({ to: homePathForRole(profile.role as AppRole), replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
            BS
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Bright Steps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to your learning dashboard.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["email", "phone"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setIdentifier("");
                  setError(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">{mode === "email" ? "Email" : "Phone number"}</Label>
              <Input
                id="identifier"
                type={mode === "email" ? "email" : "tel"}
                inputMode={mode === "email" ? "email" : "tel"}
                autoComplete={mode === "email" ? "email" : "tel"}
                placeholder={mode === "email" ? "you@example.com" : "+911234567890"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Accounts are created by the learning center. Contact your center if you need access.
        </p>
      </div>
    </main>
  );
}