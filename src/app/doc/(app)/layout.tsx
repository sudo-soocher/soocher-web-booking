import React from "react";
import { AuthGuard } from "@/doctor/components/AuthGuard";
import { DoctorSidebar } from "@/doctor/components/layout/DoctorSidebar";
import { BottomNav } from "@/doctor/components/layout/BottomNav";
import { StreamChatProvider } from "@/doctor/components/chat/StreamChatContext";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <StreamChatProvider>
        {/*
          Mobile: lock the outer shell to the viewport (`h-[100dvh] overflow-hidden`)
          so the document itself never scrolls — only <main> does. This stops iOS
          Safari's rubber-band from dragging the fixed BottomNav.
          Desktop: revert to natural document flow so the sticky sidebar keeps
          working and long pages scroll the page, not the main pane.
        */}
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F8FAFC] lg:h-auto lg:min-h-[100dvh] lg:flex-row lg:overflow-visible">
          <DoctorSidebar />
          {/*
            `min-h-0` is critical inside a flex column — without it, flex
            children default to `min-height: auto` and refuse to shrink below
            their content, which disables `overflow-y-auto` and lets the whole
            document scroll instead. That's why the BottomNav was still being
            dragged by rubber-band — the doc, not <main>, was scrolling.
          */}
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] pt-4 md:px-8 md:py-8 lg:min-h-[unset] lg:overflow-y-visible lg:overscroll-y-auto lg:pb-8">
            {children}
          </main>
          <BottomNav />
        </div>
      </StreamChatProvider>
    </AuthGuard>
  );
}
