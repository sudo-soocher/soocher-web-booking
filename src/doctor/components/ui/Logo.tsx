"use client";

import React from "react";
import { FaStethoscope } from "react-icons/fa";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
}

const sizes = {
  sm: "w-8 h-8 text-base",
  md: "w-10 h-10 text-lg",
  lg: "w-12 h-12 text-xl",
  xl: "w-16 h-16 text-2xl",
};

export const Logo = ({ className = "", size = "md", showLabel = false }: LogoProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 text-white shadow-lg shadow-primary/30 ${sizes[size]}`}
      >
        <FaStethoscope />
      </div>
      {showLabel && (
        <div className="leading-tight">
          <div className="text-lg font-black tracking-tight text-slate-900">Soocher</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            for Doctors
          </div>
        </div>
      )}
    </div>
  );
};
