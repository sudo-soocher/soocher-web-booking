const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`app-shimmer bg-slate-200/70 ${className}`} />
);

/** Loading state shaped like the home screen so auth feels like app startup. */
export function HomeShimmer() {
  return (
    <div
      className="min-h-[100dvh] w-full overflow-hidden bg-[#F8FAFC]"
      role="status"
      aria-label="Loading home"
    >
      <header
        className="md:hidden bg-[#F5F7FB]/90"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <Shimmer className="h-9 w-9 rounded-[10px]" />
            <div className="space-y-2">
              <Shimmer className="h-2 w-24 rounded-full" />
              <Shimmer className="h-4 w-36 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Shimmer className="h-10 w-10 rounded-full" />
            <Shimmer className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </header>

      <main className="md:hidden px-4 pt-2 pb-safe-nav">
        <section className="rounded-[28px] border border-white/90 bg-white/75 px-5 py-6 shadow-[0_22px_50px_rgba(46,109,212,0.10)]">
          <Shimmer className="h-7 w-36 rounded-full" />
          <Shimmer className="mt-5 h-7 w-3/4 rounded-lg" />
          <Shimmer className="mt-2 h-7 w-1/2 rounded-lg" />
          <Shimmer className="mt-4 h-3 w-full rounded-full" />
          <Shimmer className="mt-2 h-3 w-4/5 rounded-full" />
          <Shimmer className="mt-5 h-11 w-full rounded-2xl" />
        </section>

        <Shimmer className="mt-4 h-[52px] w-full rounded-2xl" />

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 rounded-[20px] border border-white/90 bg-white/75 p-3.5 shadow-sm">
              <Shimmer className="h-9 w-9 rounded-xl" />
              <Shimmer className="mt-4 h-3 w-16 rounded-full" />
            </div>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <Shimmer className="h-5 w-32 rounded-full" />
          <Shimmer className="h-3 w-12 rounded-full" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="rounded-[20px] border border-white/90 bg-white/75 p-3 shadow-sm">
              <Shimmer className="h-20 w-full rounded-2xl" />
              <Shimmer className="mt-3 h-3 w-4/5 rounded-full" />
              <Shimmer className="mt-2 h-2.5 w-1/2 rounded-full" />
            </div>
          ))}
        </div>
      </main>

      <div className="hidden md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3"><Shimmer className="h-10 w-10 rounded-xl" /><Shimmer className="h-5 w-28 rounded-full" /></div>
          <Shimmer className="h-10 w-24 rounded-xl" />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-5">
          <Shimmer className="h-[430px] w-full rounded-[38px]" />
        </div>
      </div>

      <span className="sr-only">Loading home…</span>
    </div>
  );
}
