import React from "react";

export function ShimmerBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`app-shimmer bg-slate-200/70 ${className}`} />;
}

export function DoctorListShimmer({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading content" className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <ShimmerBlock className="h-12 w-12 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <ShimmerBlock className="h-4 w-2/3 rounded-lg" />
              <ShimmerBlock className="h-3 w-1/3 rounded-lg" />
            </div>
            <ShimmerBlock className="h-8 w-16 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DoctorPageShimmer({ compact = false }: { compact?: boolean }) {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto w-full max-w-3xl space-y-5">
      <div className="space-y-3">
        <ShimmerBlock className="h-4 w-24 rounded-lg" />
        <ShimmerBlock className="h-8 w-2/3 max-w-sm rounded-xl" />
        <ShimmerBlock className="h-4 w-5/6 max-w-lg rounded-lg" />
      </div>
      <DoctorListShimmer rows={compact ? 2 : 4} />
    </div>
  );
}
