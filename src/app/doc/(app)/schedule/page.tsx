"use client";

import React from "react";
import { Chip } from "@heroui/react";

export default function SchedulePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <Chip variant="flat" color="primary" className="mb-2">
        Availability
      </Chip>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Schedule</h1>
      <p className="mt-1 text-sm text-slate-600">
        Define when patients can book you — by day, slot, and consultation type.
      </p>

      <div className="premium-card mt-8 p-8 text-center text-slate-500 md:p-12">
        Schedule editor coming soon.
      </div>
    </div>
  );
}
