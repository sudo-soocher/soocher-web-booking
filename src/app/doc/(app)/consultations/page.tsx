"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarCheck,
  FaCommentDots,
  FaFilePrescription,
  FaRedo,
  FaRegCalendarPlus,
  FaRegStickyNote,
  FaVideo,
  FaChevronRight,
} from "react-icons/fa";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VerificationBanner } from "@/doctor/components/dashboard/VerificationBanner";
import { DoctorNotificationBell } from "@/doctor/components/layout/DoctorNotificationBell";
import { DoctorListShimmer } from "@/doctor/components/ui/DoctorShimmer";
import { useAuth } from "@/doctor/lib/auth";
import {
  fetchDoctorConsultations,
  bucketConsultations,
  epochToTime,
  epochToDateStr,
  deriveStatus,
  type FirestoreConsultation,
} from "@/doctor/services/consultations";

type TabKey = "today" | "upcoming" | "past";

const TAB_EMPTY: Record<TabKey, { title: string; sub: string }> = {
  today:    { title: "All clear today",          sub: "No consultations scheduled for today."              },
  upcoming: { title: "Nothing upcoming",          sub: "New bookings will appear here automatically."       },
  past:     { title: "No past consultations",     sub: "Completed sessions will be archived here."         },
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const STATUS_STYLES = {
  scheduled: { dot: "bg-primary",      badge: "bg-primary-50 text-primary",        label: "Scheduled"  },
  completed: { dot: "bg-emerald-500",  badge: "bg-emerald-50 text-emerald-700",    label: "Completed"  },
  cancelled: { dot: "bg-rose-500",     badge: "bg-rose-50 text-rose-600",          label: "Cancelled"  },
};

const AVATAR_GRADIENTS = [
  "from-primary-400 to-primary-600",
  "from-violet-400 to-violet-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
];

/* ── Past consultations: dedicated record card ───────────────────
 * Past records care about outcomes (diagnosis, prescription, follow-up),
 * not "when can I join". This card surfaces those signals and is
 * laid out as a stacked card on mobile, a horizontal record row on
 * tablet+, and a denser 3-col layout at lg+.
 */
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function DateTicket({ ms, status }: { ms: number; status: "completed" | "cancelled" }) {
  const d = new Date(ms);
  const tone =
    status === "completed"
      ? "from-emerald-400 to-emerald-600 shadow-emerald-500/30"
      : "from-rose-400 to-rose-600 shadow-rose-500/30";
  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm md:h-14 md:w-14 ${tone}`}
    >
      <div className="text-center leading-none">
        <div className="text-[8px] font-bold uppercase tracking-widest opacity-90">
          {MONTHS[d.getMonth()]}
        </div>
        <div className="mt-0.5 text-lg font-black tracking-tight md:text-xl">
          {d.getDate()}
        </div>
      </div>
    </div>
  );
}

function PastRecordCard({ record, index }: { record: FirestoreConsultation; index: number }) {
  const router = useRouter();
  const status = deriveStatus(record) as "completed" | "cancelled";
  const time = epochToTime(record.consultationTime);
  const name = record.extras?.patientDetails?.patientName || record.patientName;
  const age = record.extras?.patientDetails?.patientAge;
  const gender = record.extras?.patientDetails?.gender;
  const isVideo = !!record.extras?.streamCallId || !!record.extras?.meetLink;
  const rx = record.prescription;
  const diagnosis = rx?.diagnosis;
  const notes = record.clinicalNotes || record.notesForDoctor;
  const summary = diagnosis || notes;
  const followUp = rx?.followUpDate || record.followUpDate;
  const statusBadge =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-rose-50 text-rose-600";
  const statusLabel = status === "completed" ? "Completed" : "Cancelled";

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
      onClick={() => router.push(`/doc/consultations/${record.consultationId}`)}
      className="group block w-full text-left"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 transition-all hover:border-primary-200 hover:shadow-md hover:shadow-primary/10 md:gap-4 md:px-4">
        <DateTicket ms={record.consultationTime} status={status} />

        <div className="min-w-0 flex-1">
          {/* Top row: name + status */}
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-black text-slate-900 md:text-base">
              {name}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest md:text-[10px] ${statusBadge}`}
            >
              {statusLabel}
            </span>
          </div>

          {/* Meta + outcome on one tight line */}
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-semibold text-slate-500">
            {age && <span>{age}y</span>}
            {age && gender && <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />}
            {gender && <span>{gender.charAt(0)}</span>}
            {(age || gender) && (
              <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
            )}
            <span
              className={`inline-flex shrink-0 items-center gap-1 font-bold ${
                isVideo ? "text-primary" : "text-emerald-600"
              }`}
            >
              {isVideo ? <FaVideo className="text-[10px]" /> : <FaCommentDots className="text-[10px]" />}
              {isVideo ? "Video" : "Chat"}
            </span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
            <span className="shrink-0 font-bold text-slate-400">{time}</span>
          </div>

          {/* Outcome — single line, truncated */}
          {summary && (
            <div className="mt-1 truncate text-[12px] leading-snug text-slate-600 md:text-[13px]">
              <span className="font-bold text-slate-700">
                {diagnosis ? "Dx: " : "Notes: "}
              </span>
              {summary}
            </div>
          )}

          {/* Inline chips — only when we have something to surface */}
          {(rx || followUp || (!summary && status === "completed")) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {rx && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                  <FaFilePrescription className="text-[9px]" /> Rx
                </span>
              )}
              {followUp && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-700">
                  <FaRegCalendarPlus className="text-[9px]" />{" "}
                  {new Date(followUp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              )}
              {!summary && status === "completed" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  <FaRegStickyNote className="text-[9px]" /> No notes
                </span>
              )}
            </div>
          )}
        </div>

        <FaChevronRight className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary md:block" />
      </div>
    </motion.button>
  );
}

function AppointmentCard({ record, index }: { record: FirestoreConsultation; index: number }) {
  const router = useRouter();
  const status   = deriveStatus(record);
  const style    = STATUS_STYLES[status];
  const time     = epochToTime(record.consultationTime);
  const endTime  = epochToTime(record.consultationExpiration);
  const dateStr  = epochToDateStr(record.consultationTime);
  const name     = record.extras?.patientDetails?.patientName || record.patientName;
  const age      = record.extras?.patientDetails?.patientAge;
  const gender   = record.extras?.patientDetails?.gender;
  const notes    = record.notesForDoctor || "General consultation";
  const isVideo  = !!record.extras?.streamCallId || !!record.extras?.meetLink;
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      onClick={() => router.push(`/doc/consultations/${record.consultationId}`)}
      className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md hover:shadow-primary/8 active:scale-[0.99]"
    >
      {/* Avatar */}
      <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-sm`}>
        {getInitials(name)}
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${style.dot}`} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-black text-slate-900">{name}</p>
          {(age || gender) && (
            <span className="shrink-0 text-[10px] font-semibold text-slate-400">
              {age && `${age}y`}{age && gender && " · "}{gender?.charAt(0)}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{notes}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">{dateStr}</span>
          <span className="text-slate-200">·</span>
          <span className="text-[10px] font-bold text-slate-500">{time} – {endTime}</span>
          <span className="text-slate-200">·</span>
          <span className={`flex items-center gap-1 text-[10px] font-bold ${isVideo ? "text-primary" : "text-emerald-600"}`}>
            {isVideo ? <FaVideo /> : <FaCommentDots />}
            {isVideo ? "Video" : "Chat"}
          </span>
        </div>
      </div>

      {/* Status + arrow */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}>
          {style.label}
        </span>
        <FaChevronRight className="text-[10px] text-slate-300 transition group-hover:text-primary" />
      </div>
    </motion.div>
  );
}

function isTabKey(v: string | null): v is TabKey {
  return v === "today" || v === "upcoming" || v === "past";
}

export default function ConsultationsPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tab is persisted in the URL (?tab=past) so back-navigation from a
  // /consultations/[id] detail page restores the previously-active tab.
  const tabParam = searchParams.get("tab");
  const tab: TabKey = isTabKey(tabParam) ? tabParam : "today";
  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "today") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<Record<TabKey, FirestoreConsultation[]>>({
    today: [], upcoming: [], past: [],
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const all = await fetchDoctorConsultations(user.uid);
      setBuckets(bucketConsultations(all));
    } catch {
      setError("Could not load consultations. Tap to retry.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  void epochToDateStr;

  const records = buckets[tab];
  const counts  = { today: buckets.today.length, upcoming: buckets.upcoming.length, past: buckets.past.length };

  return (
    <div className="mx-auto max-w-2xl lg:max-w-4xl" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Consultations
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Join, manage, and review every patient session.
          </p>
        </div>
        <DoctorNotificationBell className="lg:hidden" />
      </motion.div>

      <div className="mt-5">
        <VerificationBanner />
      </div>

      {/* Tab switcher */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="mt-4 flex gap-1 rounded-2xl bg-slate-100 p-1"
      >
        {(["today", "upcoming", "past"] as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold capitalize transition-all ${
              tab === k
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {k}
            {!loading && counts[k] > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                tab === k ? "bg-primary text-white" : "bg-slate-300 text-slate-600"
              }`}>
                {counts[k]}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DoctorListShimmer rows={4} />
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={load}
              className="premium-card flex cursor-pointer flex-col items-center gap-3 p-12 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-400">
                <FaRedo className="text-lg" />
              </div>
              <p className="text-sm font-semibold text-rose-500">{error}</p>
            </motion.div>
          ) : records.length === 0 || status === "pending" ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="premium-card grid place-items-center gap-3 p-14 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary-50 text-primary shadow-sm">
                <FaCalendarCheck className="text-2xl" />
              </div>
              <div>
                <p className="font-bold text-slate-700">
                  {status === "pending" ? "Bookings locked" : TAB_EMPTY[tab].title}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {status === "pending"
                    ? "Bookings open once your profile is approved."
                    : TAB_EMPTY[tab].sub}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={tab === "past" ? "flex flex-col gap-3 md:gap-4" : "flex flex-col gap-3"}>
              {records.map((record, i) =>
                tab === "past" ? (
                  <PastRecordCard key={record.consultationId} record={record} index={i} />
                ) : (
                  <AppointmentCard key={record.consultationId} record={record} index={i} />
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
