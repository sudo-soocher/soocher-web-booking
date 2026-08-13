interface AppShimmerProps {
  variant?: "page" | "profile";
}

const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`app-shimmer rounded-2xl bg-slate-200/70 ${className}`} />
);

/** Shared route/data fallback that mirrors the mobile app card layout. */
export function AppShimmer({ variant = "page" }: AppShimmerProps) {
  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F5F8FD] pb-safe-nav" role="status" aria-label="Loading page">
      <div className="md:hidden h-14 border-b border-white/80 bg-white/75 px-4 flex items-center gap-3">
        <Shimmer className="h-8 w-8 rounded-xl" />
        <Shimmer className="h-4 w-32" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-6 md:py-8">
        <div className="hidden md:flex items-center justify-between pb-7">
          <div className="flex items-center gap-3"><Shimmer className="h-10 w-10 rounded-xl" /><Shimmer className="h-5 w-28" /></div>
          <Shimmer className="h-9 w-20 rounded-full" />
        </div>

        {variant === "profile" ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 md:gap-8">
            <div className="min-w-0 rounded-[24px] border border-white/90 bg-white/75 p-4 shadow-sm lg:col-span-2 md:p-8">
              <div className="flex items-center gap-4 md:gap-6">
                <Shimmer className="h-[92px] w-[84px] shrink-0 rounded-[20px] md:h-36 md:w-32 md:rounded-[28px]" />
                <div className="min-w-0 flex-1 space-y-3"><Shimmer className="h-5 w-24 rounded-full" /><Shimmer className="h-7 w-4/5" /><Shimmer className="h-4 w-3/5" /></div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">{[1, 2, 3].map((item) => <Shimmer key={item} className="h-16" />)}</div>
              <div className="mt-6 space-y-3"><Shimmer className="h-5 w-24" /><Shimmer className="h-3 w-full" /><Shimmer className="h-3 w-11/12" /><Shimmer className="h-3 w-4/5" /></div>
            </div>
            <div className="min-w-0 rounded-[24px] border border-white/90 bg-white/75 p-4 shadow-sm md:p-6">
              <Shimmer className="h-6 w-40" />
              <div className="mt-5 grid grid-cols-3 gap-2">{[1, 2, 3].map((item) => <Shimmer key={item} className="h-14" />)}</div>
              <Shimmer className="mt-6 h-12 w-full" /><Shimmer className="mt-4 h-12 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-[26px] border border-white/90 bg-white/75 p-4 shadow-sm md:p-7"><Shimmer className="h-6 w-2/3 md:w-72" /><Shimmer className="mt-3 h-4 w-4/5 md:w-96" /></div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="flex h-24 items-center gap-3 rounded-[22px] border border-white/90 bg-white/75 p-3 shadow-sm md:h-44 md:p-5">
                  <Shimmer className="h-16 w-16 shrink-0 md:h-24 md:w-24" />
                  <div className="min-w-0 flex-1 space-y-2.5"><Shimmer className="h-4 w-4/5" /><Shimmer className="h-3 w-3/5" /><Shimmer className="h-3 w-1/2" /></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

