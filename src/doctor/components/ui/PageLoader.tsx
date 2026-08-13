"use client";

import React from "react";

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        position: "fixed",
        inset: 0,
        background: "#F8FAFC",
        zIndex: 50,
        padding: "max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <style>{`
        @keyframes doctor-shimmer-sweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .doctor-inline-shimmer {
          background: linear-gradient(100deg, #e8edf4 20%, #f8fafc 38%, #e8edf4 56%);
          background-size: 220% 100%;
          animation: doctor-shimmer-sweep 1.35s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) { .doctor-inline-shimmer { animation: none; } }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          paddingTop: 28,
        }}
      >
        <div className="doctor-inline-shimmer" style={{ width: 92, height: 12, borderRadius: 8 }} />
        <div className="doctor-inline-shimmer" style={{ width: "56%", maxWidth: 320, height: 30, borderRadius: 12, marginTop: 14 }} />
        <div className="doctor-inline-shimmer" style={{ width: "78%", maxWidth: 460, height: 14, borderRadius: 8, marginTop: 12 }} />
        {[0, 1, 2].map((item) => (
          <div key={item} style={{ display: "flex", gap: 14, alignItems: "center", padding: 16, marginTop: item === 0 ? 28 : 12, borderRadius: 24, background: "white", border: "1px solid #e8edf4" }}>
            <div className="doctor-inline-shimmer" style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 18 }} />
            <div style={{ flex: 1 }}>
              <div className="doctor-inline-shimmer" style={{ width: "68%", height: 14, borderRadius: 8 }} />
              <div className="doctor-inline-shimmer" style={{ width: "42%", height: 11, borderRadius: 8, marginTop: 10 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
