const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`app-shimmer rounded-2xl bg-slate-200/70 ${className}`} />
);

/**
 * Mirrors the real /profile layout: a narrow sidebar card carrying the avatar,
 * next to the stacked form sections.
 *
 * Shared by `app/profile/loading.tsx` (shown the instant the tab is tapped) and
 * the page's own `loading` state (shown while the Firestore read resolves). They
 * must be the same markup — otherwise the placeholder changes shape midway and
 * reads as two separate loads.
 */
export function ProfileShimmer() {
  return (
    <div
      className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F5F8FD] pb-safe-nav"
      role="status"
      aria-label="Loading profile"
    >
      {/* Mobile top bar */}
      <div className="md:hidden flex h-14 items-center gap-3 border-b border-white/80 bg-white/75 px-4">
        <Shimmer className="h-8 w-8 rounded-xl" />
        <Shimmer className="h-4 w-24" />
      </div>

      {/* Desktop navbar */}
      <div className="hidden md:block px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[24px] border border-white/40 bg-white/70 px-6 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <Shimmer className="h-6 w-24" />
          </div>
          <Shimmer className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-3 py-3 md:px-6 md:py-6">
        {/* Desktop page heading */}
        <div className="mb-5 hidden space-y-2 md:block">
          <Shimmer className="h-3 w-32 rounded-full" />
          <Shimmer className="h-8 w-52" />
          <Shimmer className="h-3 w-80" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
          {/* Sidebar identity card — avatar sits inline on mobile, stacked on desktop */}
          <aside className="rounded-[24px] border border-white/90 bg-white/[0.72] p-3.5 shadow-sm md:p-4 lg:p-5">
            <div className="flex items-center gap-3.5 lg:flex-col lg:text-center">
              <Shimmer className="h-[72px] w-[72px] shrink-0 rounded-[20px] md:h-20 md:w-20 md:rounded-[22px] lg:h-24 lg:w-24 lg:rounded-[26px]" />
              <div className="min-w-0 flex-1 space-y-2 lg:w-full lg:flex-none">
                <Shimmer className="h-4 w-32 lg:mx-auto" />
                <Shimmer className="h-3 w-40 lg:mx-auto" />
                <Shimmer className="h-2.5 w-24 lg:mx-auto" />
              </div>
            </div>
            <Shimmer className="mt-4 h-2 w-full rounded-full" />
            <div className="mt-4 hidden gap-2 lg:grid">
              <Shimmer className="h-10" />
              <Shimmer className="h-10" />
            </div>
          </aside>

          {/* Form sections */}
          <div className="space-y-3 md:space-y-4">
            <div className="rounded-[24px] border border-white/90 bg-white/[0.72] p-4 shadow-sm md:p-5">
              <Shimmer className="h-5 w-40" />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Shimmer key={item} className="h-12" />
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/90 bg-white/[0.72] p-4 shadow-sm md:p-5">
              <Shimmer className="h-5 w-44" />
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((item) => (
                  <Shimmer key={item} className="h-12" />
                ))}
              </div>
            </div>
            <Shimmer className="h-12 w-full rounded-2xl md:w-40" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading profile…</span>
    </div>
  );
}
