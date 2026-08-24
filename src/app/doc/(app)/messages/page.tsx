"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaCommentDots, FaLock, FaSearch } from "react-icons/fa";
import { VerificationBanner } from "@/doctor/components/dashboard/VerificationBanner";
import { DoctorNotificationBell } from "@/doctor/components/layout/DoctorNotificationBell";
import { useAuth } from "@/doctor/lib/auth";
import { DoctorListShimmer } from "@/doctor/components/ui/DoctorShimmer";

const ChatSidebar = dynamic(
  () => import("@/doctor/components/chat/ChatSidebar").then((m) => m.ChatSidebar),
  { ssr: false }
);
import { fetchDoctorPatients, type DoctorPatient } from "@/doctor/services/patients";
import { getChatAvailability } from "@/doctor/utils/chat/availability";
import type { FirestoreConsultation } from "@/doctor/services/consultations";
import { useStreamChat } from "@/doctor/components/chat/StreamChatContext";

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
    if (inDays < 7) return `In ${inDays}d`;
    return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  const days = Math.floor(diff / day);
  if (days < 1) {
    const hrs = Math.floor(diff / (60 * 60 * 1000));
    if (hrs < 1) return "Just now";
    return `${hrs}h ago`;
  }
  if (days < 2) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MessagesPage() {
  const { user, status } = useAuth();
  const { getDirectUnreadCount } = useStreamChat();
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [q, setQ] = useState("");
  const [chatTarget, setChatTarget] = useState<FirestoreConsultation | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    fetchDoctorPatients(user.uid)
      .then((list) => {
        if (cancelled) return;
        // Active chats first (still in availability window), then most-recent past
        list.sort((a, b) => {
          const aActive = getChatAvailability(a.latestConsultation).isAvailable ? 1 : 0;
          const bActive = getChatAvailability(b.latestConsultation).isAvailable ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;
          return b.lastVisitAt - a.lastVisitAt;
        });
        setPatients(list);
      })
      .catch(() => !cancelled && setErrored(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.phone || "").toLowerCase().includes(query)
    );
  }, [patients, q]);

  const activeCount = useMemo(
    () =>
      patients.filter((p) => getChatAvailability(p.latestConsultation).isAvailable).length,
    [patients]
  );

  const isVerified = status === "verified";

  return (
    <div className="mx-auto max-w-3xl" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Messages
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every patient you&rsquo;ve consulted with — chats stay open for 7 days after each visit.
          </p>
        </div>
        <DoctorNotificationBell className="lg:hidden" />
      </motion.div>

      <div className="mt-5">
        <VerificationBanner />
      </div>

      {/* Quick stats + search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="mt-4 flex flex-col gap-3 md:flex-row md:items-center"
      >
        <div className="flex flex-1 items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 transition focus-within:border-primary/40 focus-within:shadow-sm focus-within:shadow-primary/5">
          <FaSearch className="shrink-0 text-sm text-slate-400" />
          <input
            type="text"
            placeholder="Search patients by name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {activeCount} active
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-slate-600">
            {patients.length} total
          </span>
        </div>
      </motion.div>

      {/* Body */}
      <div className="mt-5">
        {!isVerified ? (
          <EmptyState
            icon={<FaLock />}
            title="Bookings locked"
            sub="Patient messages unlock once your profile is verified."
          />
        ) : loading ? (
          <DoctorListShimmer rows={5} />
        ) : errored ? (
          <EmptyState
            icon={<FaCommentDots />}
            title="Couldn't load messages"
            sub="Refresh the page. If this persists, contact support."
          />
        ) : filtered.length === 0 ? (
          patients.length === 0 ? (
            <EmptyState
              icon={<FaCommentDots />}
              title="No conversations yet"
              sub="When a patient books a consultation with you, their chat will appear here automatically."
            />
          ) : (
            <EmptyState icon={<FaSearch />} title="No matches" sub="Try a different name or phone." />
          )
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white">
            <ul className="divide-y divide-slate-100">
              {filtered.map((p, i) => (
                <MessageRow
                  key={p.uid}
                  patient={p}
                  index={i}
                  unreadCount={getDirectUnreadCount(p.uid)}
                  onOpen={() => setChatTarget(p.latestConsultation)}
                />
              ))}
            </ul>
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

function MessageRow({
  patient,
  index,
  unreadCount,
  onOpen,
}: {
  patient: DoctorPatient;
  index: number;
  unreadCount: number;
  onOpen: () => void;
}) {
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const chatWindow = getChatAvailability(patient.latestConsultation);
  const isUpcoming = patient.hasUpcoming;
  const meta: string[] = [];
  if (patient.age != null) meta.push(`${patient.age}y`);
  if (patient.gender) meta.push(patient.gender.charAt(0));

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 12) * 0.025 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary-50/40 md:px-5"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          {patient.photoUrl ? (
            <Image
              src={patient.photoUrl}
              alt={patient.name}
              width={48}
              height={48}
              loading="lazy"
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-primary-50"
            />
          ) : (
            <div
              className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-md shadow-primary/20`}
            >
              {getInitials(patient.name)}
            </div>
          )}
          {/* Status dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
              chatWindow.isAvailable ? "bg-emerald-500" : "bg-slate-300"
            }`}
            aria-hidden
          />
        </div>

        {/* Middle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-black text-slate-900 md:text-base">
              {patient.name}
            </div>
            <div className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {relativeDay(patient.lastVisitAt)}
            </div>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-semibold text-slate-500">
            {meta.length > 0 && (
              <>
                <span>{meta.join(" · ")}</span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
              </>
            )}
            {chatWindow.isAvailable ? (
              <span className="font-bold text-emerald-600">
                {isUpcoming ? "Upcoming consult" : "Chat active"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-slate-400">
                <FaLock className="text-[9px]" /> Read-only
              </span>
            )}
            <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
            <span className="truncate">
              {patient.visitCount} visit{patient.visitCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Right: chat affordance */}
        {unreadCount > 0 && (
          <span
            className="grid min-h-6 min-w-6 shrink-0 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white shadow-sm shadow-rose-200"
            aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <span
          className={`hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition md:inline-flex ${
            chatWindow.isAvailable
              ? "bg-primary text-white shadow-sm shadow-primary/30 group-hover:shadow-md group-hover:shadow-primary/40"
              : "border border-slate-200 bg-white text-slate-600 group-hover:border-primary-200 group-hover:text-primary"
          }`}
        >
          <FaCommentDots className="text-[10px]" />
          {chatWindow.isAvailable ? "Chat" : "View"}
        </span>
      </button>
    </motion.li>
  );
}

function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="premium-card grid place-items-center gap-3 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-xl text-primary">
        {icon}
      </div>
      <div>
        <div className="text-lg font-black tracking-tight text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{sub}</div>
      </div>
    </div>
  );
}
