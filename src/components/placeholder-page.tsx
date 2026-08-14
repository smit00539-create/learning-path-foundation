export function PlaceholderPage({ title, hint }: { title: string; hint?: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed bg-card p-10 text-center">
        <p className="text-base font-semibold">Coming in a later phase</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {hint ?? "This section is part of the roadmap and isn't built yet."}
        </p>
      </div>
    </section>
  );
}