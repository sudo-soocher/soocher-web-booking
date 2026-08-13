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

      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-12">
        <div className="rounded-[26px] border border-white/90 bg-white/[0.72] p-5 shadow-sm md:p-7">
          {/* Success badge + headline */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Shimmer className="h-14 w-14 rounded-full" />
            <Shimmer className="h-6 w-52" />
            <Shimmer className="h-3 w-64" />
          </div>

          {/* Appointment detail rows */}
          <div className="mt-7 space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <Shimmer key={item} className="h-14" />
            ))}
          </div>

          {/* Meet link + actions */}
          <Shimmer className="mt-6 h-12 w-full" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Shimmer className="h-12" />
            <Shimmer className="h-12" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading booking confirmation…</span>
    </div>
  );
}
