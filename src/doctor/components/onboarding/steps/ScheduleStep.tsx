"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheck, FaChevronDown, FaRegCalendarCheck, FaRegClock } from "react-icons/fa";
import { ErrorBanner, StepShell } from "@/doctor/components/onboarding/shell";
import { useAuth } from "@/doctor/lib/auth";
import { useStepSave } from "@/doctor/lib/edit-mode";
import { DEFAULT_TIME_SLOTS, STEPS } from "@/doctor/lib/onboarding";
import type { DayKey, TimeSlot, WeeklyTimeSlots } from "@/doctor/types/doctor";

const DAY_KEYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DAY_SHORT: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// Legacy records (created before we aligned to the admin schema) used 3-letter
// keys. Remap on load so those doctors don't lose their schedule.
const LEGACY_DAY_KEYS: Record<string, DayKey> = {
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
  sat: "saturday",
  sun: "sunday",
};

function normalizeTimeSlots(raw: unknown): WeeklyTimeSlots {
  const next: WeeklyTimeSlots = { ...DEFAULT_TIME_SLOTS };
  if (!raw || typeof raw !== "object") return next;
  for (const [k, v] of Object.entries(raw as Record<string, TimeSlot>)) {
    const key = (DAY_LABELS as Record<string, unknown>)[k]
      ? (k as DayKey)
      : LEGACY_DAY_KEYS[k];
    if (key && v) next[key] = { ...next[key], ...v };
  }
  return next;
}

const SLOT_OPTIONS = [
  { v: "15", label: "15 minutes" },
  { v: "30", label: "30 minutes" },
  { v: "45", label: "45 minutes" },
  { v: "55", label: "55 minutes (Psychology)" },
  { v: "60", label: "60 minutes" },
];

const BREAK_OPTIONS = [
  { v: "0", label: "No break" },
  { v: "5", label: "5 minutes" },
  { v: "10", label: "10 minutes" },
  { v: "15", label: "15 minutes" },
  { v: "30", label: "30 minutes" },
];

function parseTime(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":");
  return parseInt(h, 10) * 60 + (parseInt(m, 10) || 0);
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function generateSlots(slot: TimeSlot, slotDuration: number, breakBetween: number): string[] {
  if (!slot.enabled) return [];
  const start = parseTime(slot.startTime);
  const end = parseTime(slot.endTime);
  if (end - start <= 0 || slotDuration <= 0) return [];
  const out: string[] = [];
  let cur = start;
  while (cur + slotDuration <= end) {
    out.push(`${formatTime(cur)} - ${formatTime(cur + slotDuration)}`);
    cur += slotDuration + breakBetween;
  }
  return out;
}

export default function ScheduleStep() {
  const { profile } = useAuth();
  const save = useStepSave();
  const meta = STEPS[10];

  const [timeSlots, setTimeSlots] = useState<WeeklyTimeSlots>({ ...DEFAULT_TIME_SLOTS });
  const [slotDuration, setSlotDuration] = useState("15");
  const [breakBetween, setBreakBetween] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<DayKey | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.timeSlots) {
      setTimeSlots(normalizeTimeSlots(profile.timeSlots));
    }
    if (profile.slotDuration != null) setSlotDuration(String(profile.slotDuration));
    if (profile.breakBetweenSlots != null) setBreakBetween(String(profile.breakBetweenSlots));
  }, [profile]);

  const slotDur = Number(slotDuration) || 15;
  const breakDur = Number(breakBetween) || 0;

  const totalSlots = useMemo(
    () =>
      DAY_KEYS.reduce(
        (sum, k) => sum + generateSlots(timeSlots[k], slotDur, breakDur).length,
        0
      ),
    [timeSlots, slotDur, breakDur]
  );

  const setDay = (k: DayKey, patch: Partial<TimeSlot>) =>
    setTimeSlots((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  const handleNext = async () => {
    setError(null);
    if (!Object.values(timeSlots).some((s) => s.enabled)) {
      return setError("Enable at least one day.");
    }
    for (const k of DAY_KEYS) {
      const s = timeSlots[k];
      if (s.enabled && parseTime(s.startTime) >= parseTime(s.endTime)) {
        return setError(`${DAY_LABELS[k]}: end time must be after start time.`);
      }
    }
    await save({
      slice: {
        timeSlots,
        slotDuration: slotDur,
        breakBetweenSlots: breakDur,
      },
      nextStep: 12,
      fromSlug: meta.slug,
    });
  };

  const applyPreset = (kind: "all" | "weekdays" | "clear") => {
    setTimeSlots((prev) => {
      const next = { ...prev };
      for (const k of DAY_KEYS) {
        if (kind === "all") next[k] = { ...next[k], enabled: true };
        else if (kind === "clear") next[k] = { ...next[k], enabled: false };
        else next[k] = { ...next[k], enabled: k !== "saturday" && k !== "sunday" };
      }
      return next;
    });
  };

  const enabledCount = DAY_KEYS.filter((k) => timeSlots[k].enabled).length;
  const isPresetActive = (kind: "all" | "weekdays" | "clear"): boolean => {
    if (kind === "all") return enabledCount === 7;
    if (kind === "clear") return enabledCount === 0;
    return (
      DAY_KEYS.every((k) =>
        k === "saturday" || k === "sunday"
          ? !timeSlots[k].enabled
          : timeSlots[k].enabled
      )
    );
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      {/* Hero: weekly total + global settings, side-by-side on tablet+ */}
      <div className="overflow-hidden rounded-[32px] border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-primary-50 p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center lg:gap-6">
          {/* Stat */}
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-lg shadow-primary/20 ring-1 ring-primary-100">
              <FaRegCalendarCheck className="text-xl" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                Weekly availability
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-black leading-none tracking-tight text-slate-900 md:text-5xl">
                  {totalSlots}
                </span>
                <span className="text-xs font-bold text-slate-500">slots / week</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {enabledCount} day{enabledCount === 1 ? "" : "s"} available
              </div>
            </div>
          </div>

          {/* Global settings */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
            <SettingSelect
              icon={<FaRegClock />}
              label="Slot duration"
              value={slotDuration}
              onChange={setSlotDuration}
              options={SLOT_OPTIONS}
            />
            <SettingSelect
              label="Break between"
              value={breakBetween}
              onChange={setBreakBetween}
              options={BREAK_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Quick presets — match the admin's quick-action shortcuts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Quick set
        </span>
        <PresetChip active={isPresetActive("all")} onPress={() => applyPreset("all")}>
          All 7 days
        </PresetChip>
        <PresetChip active={isPresetActive("weekdays")} onPress={() => applyPreset("weekdays")}>
          Weekdays only
        </PresetChip>
        <PresetChip active={isPresetActive("clear")} onPress={() => applyPreset("clear")}>
          Clear all
        </PresetChip>
      </div>

      {/* Per-day cards */}
      <div className="space-y-3">
        {DAY_KEYS.map((k, i) => {
          const day = timeSlots[k];
          const slots = generateSlots(day, slotDur, breakDur);
          return (
            <DayCard
              key={k}
              dayKey={k}
              slot={day}
              slots={slots}
              expanded={expanded === k}
              onToggleEnable={() => setDay(k, { enabled: !day.enabled })}
              onStart={(v) => setDay(k, { startTime: v })}
              onEnd={(v) => setDay(k, { endTime: v })}
              onToggleExpand={() => setExpanded(expanded === k ? null : k)}
              index={i}
            />
          );
        })}
      </div>

      <ErrorBanner message={error} />
    </StepShell>
  );
}

/* ── helper components ─────────────────────────────────────────── */

function SettingSelect({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  const currentLabel = options.find((o) => o.v === value)?.label ?? "";
  return (
    <label className="group relative block cursor-pointer rounded-2xl border-2 border-slate-100 bg-white p-3 transition hover:border-primary-200 focus-within:border-primary">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {icon && <span className="text-[11px] text-primary">{icon}</span>}
        {label}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-base font-black tracking-tight text-slate-900">
          {currentLabel}
        </span>
        <FaChevronDown className="text-[10px] text-slate-400 transition group-hover:text-primary" />
      </div>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PresetChip({
  active,
  onPress,
  children,
}: {
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-primary text-white shadow-md shadow-primary/30"
          : "border border-slate-200 bg-white text-slate-700 hover:border-primary-200 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function DayCard({
  dayKey,
  slot,
  slots,
  expanded,
  onToggleEnable,
  onStart,
  onEnd,
  onToggleExpand,
  index,
}: {
  dayKey: DayKey;
  slot: TimeSlot;
  slots: string[];
  expanded: boolean;
  onToggleEnable: () => void;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  onToggleExpand: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`overflow-hidden rounded-[28px] border bg-white transition-colors ${
        slot.enabled
          ? "border-primary-100 shadow-sm shadow-primary/10"
          : "border-slate-100"
      }`}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 p-4 md:gap-x-5">
        {/* Badge + label — top-left */}
        <div className="col-start-1 row-start-1 flex items-center gap-3">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[11px] font-black tracking-tight transition ${
              slot.enabled
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {DAY_SHORT[dayKey].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-slate-900">
              {DAY_LABELS[dayKey]}
            </div>
            <div
              className={`text-[11px] font-bold ${
                slot.enabled ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {slot.enabled ? "Available" : "Unavailable"}
            </div>
          </div>
        </div>

        {/* Toggle — top-right on every breakpoint */}
        <div className="col-start-3 row-start-1 flex justify-end">
          <DayToggle
            on={slot.enabled}
            onChange={onToggleEnable}
            label={DAY_LABELS[dayKey]}
          />
        </div>

        {/* Times + slot-count chip — row 2 mobile, middle col desktop */}
        <div className="col-span-3 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1">
          {slot.enabled ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-3">
              <div className="flex flex-1 items-end gap-2">
                <TimeField label="From" value={slot.startTime} onChange={onStart} />
                <div className="pb-2 text-slate-300">→</div>
                <TimeField label="To" value={slot.endTime} onChange={onEnd} />
              </div>
              {slots.length > 0 && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="group flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary-100 md:self-end md:mb-1"
                >
                  <span>{slots.length} slots</span>
                  <FaChevronDown
                    className={`text-[10px] transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleEnable}
              className="text-left text-xs font-semibold text-slate-400 hover:text-primary"
            >
              Tap the toggle to set hours for {DAY_LABELS[dayKey]}.
            </button>
          )}
        </div>
      </div>

      {/* Generated slots — collapsible */}
      <AnimatePresence initial={false}>
        {slot.enabled && expanded && slots.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-slate-100 bg-slate-50/60"
          >
            <div className="px-4 py-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Generated time slots
              </div>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-primary-100 bg-white px-2.5 py-1 text-[11px] font-bold text-primary"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <Input
        type="time"
        value={value}
        onValueChange={onChange}
        variant="bordered"
        radius="lg"
        size="sm"
        classNames={{
          inputWrapper:
            "border-2 border-slate-200 bg-white rounded-xl shadow-sm transition-all " +
            "data-[hover=true]:border-primary-300 data-[hover=true]:shadow-md data-[hover=true]:shadow-primary/5 " +
            "group-data-[focus=true]:border-primary group-data-[focus=true]:shadow-lg group-data-[focus=true]:shadow-primary/15",
          input: "text-base md:text-sm font-bold text-slate-900",
        }}
      />
    </div>
  );
}

function DayToggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label} availability`}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors ${
        on
          ? "border-primary bg-primary"
          : "border-slate-200 bg-slate-100"
      }`}
    >
      <span
        className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      >
        {on && <FaCheck className="text-[8px] text-primary" />}
      </span>
    </button>
  );
}
