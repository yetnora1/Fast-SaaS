/**
 * Instant navigation skeleton.
 *
 * Rendered by each route group's `loading.tsx` (a React Suspense boundary) so a
 * nav click paints a skeleton *immediately* instead of freezing on the previous
 * page while the destination segment renders on the server. On Vercel this masks
 * serverless cold-start + DB latency, which is the bulk of the perceived lag.
 *
 * It renders inside the layout's <main>, so no outer width/padding here.
 */
export function RouteLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-brand-surface2" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl border border-brand-border/70 bg-brand-surface2/60" />
        ))}
      </div>
    </div>
  );
}
