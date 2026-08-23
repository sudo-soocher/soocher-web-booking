"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@heroui/react";
import {
  FaArrowLeft,
  FaCalendarPlus,
  FaCommentDots,
  FaSearch,
  FaUserFriends,
  FaUserPlus,
  FaVenusMars,
} from "react-icons/fa";
import { VerificationBanner } from "@/doctor/components/dashboard/VerificationBanner";
import { useAuth } from "@/doctor/lib/auth";
import { DoctorListShimmer } from "@/doctor/components/ui/DoctorShimmer";
import {
  fetchDoctorPatients,
  type DoctorPatient,
} from "@/doctor/services/patients";
import { getChatAvailability } from "@/doctor/utils/chat/availability";
import type { FirestoreConsultation } from "@/doctor/services/consultations";

const ChatSidebar = dynamic(
  () => import("@/doctor/components/chat/ChatSidebar").then((m) => m.ChatSidebar),
  { ssr: false }
);

type Filter = "all" | "upcoming";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All patients" },
  { key: "upcoming", label: "Has upcoming" },
];

const AVATAR_GRADIENTS = [
  "from-primary-400 to-primary-600",
  "from-violet-400 to-violet-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
  "from-rose-400 to-rose-600",
  "from-sky-400 to-sky-600",
];

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "P"
  );
}

function relativeDay(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  const day = 86400000;
  if (diff < 0) {
    const inDays = Math.ceil(-diff / day);
    if (inDays <= 1) return "Tomorrow";
    if (inDays < 7) return `In ${inDays} days`;
    if (inDays < 30) return `In ${Math.round(inDays / 7)} wk`;
    return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  const days = Math.floor(diff / day);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)} wk ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function PatientsPage() {
  const router = useRouter();
  const { user, profile, status } = useAuth();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/doc/dashboard");
    }
  };
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [chatTarget, setChatTarget] = useState<FirestoreConsultation | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    fetchDoctorPatients(user.uid)
      .then((list) => {
        if (cancelled) return;
        // newest visit first
        list.sort((a, b) => b.lastVisitAt - a.lastVisitAt);
        setPatients(list);
      })
      .catch(() => {
        if (cancelled) return;
        setErrored(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (filter === "upcoming" && !p.hasUpcoming) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q)
      );
    });
  }, [patients, filter, search]);

  const totalUpcoming = useMemo(
    () => patients.filter((p) => p.hasUpcoming).length,
    [patients]
  );

  const isVerified = status === "verified";
  const fullName = typeof profile?.fullName === "string" ? profile.fullName : "";
  const firstName = fullName.split(/\s+/)[0] || "";

  return (
    <div className="mx-auto max-w-7xl">
      {/* Back nav */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleBack}
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100 transition hover:text-primary hover:ring-primary-200 md:mb-6"
      >
        <FaArrowLeft className="text-[10px]" />
        Back
      </motion.button>

      <VerificationBanner />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
            People
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            My patients
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600 md:text-base">
            Everyone you&rsquo;ve consulted{firstName ? `, Dr. ${firstName}` : ""}. Search, follow up, book next visit.
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3">
          <StatPill icon={<FaUserFriends />} value={patients.length} label="Total" />
          <StatPill icon={<FaCalendarPlus />} value={totalUpcoming} label="Upcoming" tone="emerald" />
        </div>
      </motion.div>

      {/* Search + filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mt-6 flex flex-col gap-3 md:flex-row md:items-center"
      >
        <div className="flex-1">
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search by name, phone, or city"
            variant="bordered"
            radius="lg"
            size="lg"
            startContent={<FaSearch className="text-slate-400" />}
            classNames={{
              inputWrapper:
                "border-2 border-slate-100 data-[hover=true]:border-primary-200 group-data-[focus=true]:border-primary bg-white",
              input: "text-base md:text-sm font-semibold text-slate-900 placeholder:text-slate-400",
            }}
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                filter === f.key
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-primary-200 hover:text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Body */}
      <div className="mt-6">
        {!isVerified ? (
          <EmptyState
            title="Verification pending"
            sub="Patient bookings are unlocked once your profile is verified."
          />
        ) : loading ? (
          <DoctorListShimmer rows={5} />
        ) : errored ? (
          <EmptyState
            title="Couldn't load your patients"
            sub="Refresh the page. If this keeps happening, contact support."
          />
        ) : filtered.length === 0 ? (
          patients.length === 0 ? (
            <EmptyState
              icon={<FaUserPlus />}
              title="No patients yet"
              sub="Once a patient books a consultation with you, they'll show up here automatically."
            />
          ) : (
            <EmptyState
              title="No matches"
              sub="Try a different name, phone number, or filter."
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p, i) => (
              <PatientCard
                key={p.uid}
                patient={p}
                index={i}
                onChat={() => setChatTarget(p.latestConsultation)}
              />
            ))}
          </div>
        )}
      </div>

      {chatTarget && (
        <ChatSidebar
          isOpen={!!chatTarget}
          onClose={() => setChatTarget(null)}
          consultation={chatTarget}
        />
      )}
    </div>
  );
}

/* ── components ─────────────────────────────────────────────────── */

function StatPill({
  icon,
  value,
  label,
  tone = "primary",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone?: "primary" | "emerald";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : "bg-primary-50 text-primary ring-primary-100";
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ring-1 ${toneClass}`}
    >
      <span className="text-base">{icon}</span>
      <div>
        <div className="text-lg font-black leading-none tracking-tight">{value}</div>
        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest opacity-80">
          {label}
        </div>
      </div>
    </div>
  );
}

function PatientCard({
  patient,
  index,
  onChat,
}: {
  patient: DoctorPatient;
  index: number;
  onChat: () => void;
}) {
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const meta: string[] = [];
  if (patient.age != null) meta.push(`${patient.age} yrs`);
  if (patient.gender) meta.push(patient.gender);
  if (patient.city) meta.push(patient.city);

  const chatWindow = getChatAvailability(patient.latestConsultation);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      className="group relative flex flex-col gap-4 rounded-[28px] border border-slate-100 bg-white p-5 transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl hover:shadow-primary/10"
    >
      {patient.hasUpcoming && (
        <span className="absolute -top-2 right-4 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md shadow-emerald-500/30">
          Upcoming
        </span>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        {patient.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={patient.photoUrl}
            alt={patient.name}
            className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-primary-50"
          />
        ) : (
          <div
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-base font-black text-white shadow-md shadow-primary/20`}
          >
            {getInitials(patient.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-black text-slate-900">
            {patient.name}
          </div>
          {meta.length > 0 ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              {meta.map((m, idx) => (
                <React.Fragment key={m}>
                  {idx > 0 && (
                    <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                  )}
                  <span className="inline-flex items-center gap-1">
                    {idx === 1 && patient.gender ? (
                      <FaVenusMars className="text-[10px] text-slate-400" />
                    ) : null}
                    {m}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="mt-0.5 text-[11px] font-semibold italic text-slate-400">
              No profile details yet
            </div>
          )}
        </div>
      </div>

      {/* Visit stats */}
      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Visits
          </div>
          <div className="text-base font-black tracking-tight text-slate-900">
            {patient.visitCount}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Last seen
          </div>
          <div className="text-sm font-black tracking-tight text-primary">
            {relativeDay(patient.lastVisitAt)}
          </div>
        </div>
      </div>

      {/* Contact strip */}
      {(patient.phone || patient.email) && (
        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500">
          {patient.phone && (
            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-primary">
              {patient.phone}
            </span>
          )}
          {patient.email && (
            <span className="truncate rounded-full bg-slate-100 px-2.5 py-1">
              {patient.email}
            </span>
          )}
        </div>
      )}

      {!patient.hasProfile && (
        <p className="text-[11px] font-semibold italic text-slate-400">
          Profile not on Soocher yet — info from booking only.
        </p>
      )}

      {/* Chat CTA — always opens the chat, but the ChatSidebar drops into
          read-only mode if the chat window (default 7 days post-consult)
          has closed. */}
      <button
        type="button"
        onClick={onChat}
        className={`mt-auto flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
          chatWindow.isAvailable
            ? "bg-primary text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30"
            : "border border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary"
        }`}
      >
        <FaCommentDots className="text-xs" />
        {chatWindow.isAvailable ? "Chat with patient" : "View chat (read-only)"}
      </button>
    </motion.div>
  );
}

function EmptyState({
  icon,
  title,
  sub,
}: {
  icon?: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="premium-card grid place-items-center gap-3 p-10 text-center md:p-14">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-xl text-primary">
        {icon ?? <FaCommentDots />}
      </div>
      <div>
        <div className="text-lg font-black tracking-tight text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{sub}</div>
      </div>
    </div>
  );
}
