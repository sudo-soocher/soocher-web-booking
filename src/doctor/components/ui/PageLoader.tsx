"use client";

import React from "react";

/**
 * Full-screen branded loader that does NOT depend on Tailwind, HeroUI, or any
 * client-side JS being mounted. Uses inline styles + an inline @keyframes
 * block so it renders correctly even from server-rendered HTML before the
 * stylesheet or React bundle finishes loading.
 *
 * This is the canonical loader for onboarding/auth pages where a flash of
 * blank white during refresh is unacceptable.
 */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "#F8FAFC",
        zIndex: 50,
      }}
    >
      <style>{`
        @keyframes soocher-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          width: 56,
          height: 56,
          border: "4px solid rgba(46, 109, 212, 0.15)",
          borderTopColor: "#2e6dd4",
          borderRadius: "50%",
          animation: "soocher-spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}
