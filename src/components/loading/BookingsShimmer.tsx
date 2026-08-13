const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`app-shimmer rounded-2xl bg-slate-200/70 ${className}`} />
);

/**
 * Mirrors the real /bookings layout: a row of three status tiles above a stack
 * of full-width consultation cards.
 *
 * Shared by `app/bookings/loading.tsx` and the page's own `loading` state so the
 * placeholder keeps one shape from tap through to content.
 */
export function BookingsShimmer() {
  return (
    <div
      className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F5F8FD] pb-safe-nav"
      role="status"
      aria-label="Loading bookings"
    >
      <div className="md:hidden flex h-14 items-center gap-3 border-b border-white/80 bg-white/75 px-4">
        <Shimmer className="h-8 w-8 rounded-xl" />
        <Shimmer className="h-4 w-28" />
      </div>

      <div className="hidden md:block px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[24px] border border-white/40 bg-white/70 px-6 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <Shimmer className="h-6 w-24" />
          </div>
          <Shimmer className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-3 px-3 py-4 md:space-y-4 md:px-6 md:py-10">
        {/* Upcoming / Active / Past tiles */}
        <div className="mb-5 grid grid-cols-3 gap-2 md:gap-3">
          {[1, 2, 3].map((item) => (
            <Shimmer key={item} className="h-16 border border-white md:h-20" />
          ))}
        </div>

        {[1, 2, 3].map((item) => (
          <Shimmer key={item} className="h-32 border border-white md:h-28" />
        ))}
      </div>
      <span className="sr-only">Loading bookings…</span>
    </div>
  );
}
