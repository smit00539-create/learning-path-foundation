import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Sparkles, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { homePathForRole, type AppRole } from "@/lib/use-profile";

export const Route = createFileRoute("/auth")({
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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(user: string, pass: string) {
    setError(null);
    setLoading(true);
    try {
      const value = user.trim();
      const credentials = value.includes("@")
        ? { email: value, password: pass }
        : { phone: value, password: pass };
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword(credentials);
      if (signInError) {
        setError("Those details didn't match an account. Please check and try again.");
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void signIn(identifier, password);
  }

  function useDemo(user: string) {
    setIdentifier(user);
    setPassword(DEMO_PASSWORD);
    void signIn(user, DEMO_PASSWORD);
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-12">
      {/* soft decorative background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
            BS
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Bright Steps</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One sign in for parents and instructors.
          </p>
        </div>

        <div className="rounded-3xl border bg-card/90 p-6 shadow-xl shadow-primary/5 backdrop-blur sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="Username given by the center"
                className="h-12 rounded-xl"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-dashed bg-muted/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" /> Demo logins
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Password for both: <span className="font-semibold">{DEMO_PASSWORD}</span>
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  disabled={loading}
                  onClick={() => useDemo(account.username)}
                  className="rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                >
                  <span className="block text-sm font-semibold">{account.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {account.username}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Accounts are created by the learning center. Contact your center if you need access.
        </p>
      </div>
    </main>
  );
}

const DEMO_PASSWORD = "BrightSteps2026!";

const DEMO_ACCOUNTS = [
  { label: "Admin demo", username: "demo.admin@brightsteps.app" },
  { label: "Parent demo", username: "demo.parent@brightsteps.app" },
];