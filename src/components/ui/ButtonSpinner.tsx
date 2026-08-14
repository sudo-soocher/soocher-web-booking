"use client";

import React from "react";

interface ButtonSpinnerProps {
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/** One loader for every async action button in both app surfaces. */
export function ButtonSpinner({ label = "Loading", size = "md", className = "" }: ButtonSpinnerProps) {
  const dimensions = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`} role="status" aria-label={label}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className={`${dimensions} animate-spin`} fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-100" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
