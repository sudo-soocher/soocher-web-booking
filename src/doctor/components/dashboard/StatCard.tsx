"use client";

import React from "react";
import { motion } from "framer-motion";
import type { IconType } from "react-icons";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconType;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  index?: number;
}

const trendColors = {
  up: "text-emerald-600 bg-emerald-50",
  down: "text-rose-600 bg-rose-50",
  neutral: "text-slate-600 bg-slate-50",
};

export const StatCard = ({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = "neutral",
  index = 0,
}: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="premium-card p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary shadow-sm">
          <Icon className="text-lg" />
        </div>
        {trend && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${trendColors[trendDirection]}`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="mt-5">
        <div className="text-3xl font-black tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
      </div>
    </motion.div>
  );
};
