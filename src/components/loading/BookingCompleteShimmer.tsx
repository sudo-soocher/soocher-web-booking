const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`app-shimmer rounded-2xl bg-slate-200/70 ${className}`} />
);

/**
 * Mirrors the real /booking-complete layout: a single tall confirmation card in
 * a narrow column. Shared by the route's `loading.tsx` and the page's own
 * `loading` state.
 */
export function BookingCompleteShimmer() {
  return (
    <div
      className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F5F8FD] pb-safe-nav"
      role="status"
      aria-label="Loading booking confirmation"
    >
      <div className="px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[24px] border border-white/40 bg-white/70 px-4 py-3 shadow-sm md:px-6">
          <div className="flex items-center gap-2">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <Shimmer className="h-6 w-24" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 md:px-6 md:py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Shimmer className="h-16 w-16 rounded-full" />
          <Shimmer className="h-7 w-48" />
          <Shimmer className="h-3 w-64 max-w-full" />
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
          <Shimmer className="h-24 w-full rounded-none" />
          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Shimmer className="h-16" />
              <Shimmer className="h-16" />
            </div>
            <div className="grid grid-cols-1 gap-3 border-y border-dashed border-slate-200 py-4 sm:grid-cols-2">
              <Shimmer className="h-20" />
              <Shimmer className="h-20" />
            </div>
            <Shimmer className="h-16 w-full" />
          </div>
        </div>

        <Shimmer className="h-24 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Shimmer className="h-14" />
          <Shimmer className="h-14" />
        </div>
      </div>
      <span className="sr-only">Loading booking confirmation…</span>
    </div>
  );
}
