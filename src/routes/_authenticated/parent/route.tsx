import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Sun, TrendingUp, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/use-profile";
import { useSignOut } from "@/lib/use-signout";

const NAV = [
  { to: "/parent/today", label: "Today", icon: Sun },
  { to: "/parent/progress", label: "Progress", icon: TrendingUp },
  { to: "/parent/history", label: "History", icon: History },
] as const;

export const Route = createFileRoute("/_authenticated/parent")({
  component: ParentLayout,
});

function ParentLayout() {
  const { data: profile, isLoading } = useProfile();
  const signOut = useSignOut();

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (profile && profile.role !== "parent") {
    throw redirect({ to: "/admin/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            BS
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Bright Steps</p>
            <p className="text-xs text-muted-foreground">
              {profile?.full_name ?? "Parent"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1 px-5 pb-28 pt-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-primary" }}
              className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}