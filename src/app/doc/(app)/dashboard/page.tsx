"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "framer-motion";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FaArrowRight, FaCalendarCheck, FaCheckCircle, FaChevronRight, FaClock, FaCommentDots, FaPlus, FaUsers, FaVideo } from "react-icons/fa";
import { VerificationBanner } from "@/doctor/components/dashboard/VerificationBanner";
import { HomeHeroVector } from "@/doctor/components/dashboard/HomeHeroVector";
import { DoctorNotificationBell } from "@/doctor/components/layout/DoctorNotificationBell";
import { useAuth } from "@/doctor/lib/auth";
import { db } from "@/doctor/lib/firebase";
import { bucketConsultations, epochToTime, type FirestoreConsultation } from "@/doctor/services/consultations";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2);
}

function patientName(consultation: FirestoreConsultation) {
  return consultation.extras?.patientDetails?.patientName || consultation.patientName;
}

function isLive(consultation: FirestoreConsultation, now: number) {
  return !consultation.cancelledByDoctor && !consultation.videoConsultDone && now >= consultation.consultationTime && now <= consultation.consultationExpiration;
}

function StatValue({ value, loading }: { value: number; loading: boolean }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (loading) return;
    if (reduceMotion) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    const from = prevRef.current;
    prevRef.current = value;
    const controls = animate(from, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, loading, reduceMotion]);

  if (loading) {
    return <span className="inline-block h-5 w-8 animate-pulse rounded bg-slate-100 md:h-7" />;
  }
  return <>{display}</>;
}

function AppointmentRow({ consultation, index = 0 }: { consultation: FirestoreConsultation; index?: number }) {
  const name = patientName(consultation);
  const details = consultation.extras?.patientDetails;
  const isVideo = Boolean(consultation.extras?.streamCallId || consultation.extras?.meetLink);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
    <Link href={`/doc/consultations/${consultation.consultationId}`} className="doctor-tap group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-3 transition hover:border-slate-200 hover:bg-slate-50 sm:px-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-extrabold text-slate-600">{getInitials(name)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          {details?.patientAge && <span>{details.patientAge} yrs</span>}
          {details?.patientAge && details?.gender && <span>•</span>}
          {details?.gender && <span>{details.gender}</span>}
          {(details?.patientAge || details?.gender) && <span>•</span>}
          <span>{isVideo ? "Video visit" : "Chat visit"}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-extrabold text-slate-900">{epochToTime(consultation.consultationTime)}</p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{isVideo ? "Video" : "Chat"}</p>
      </div>
      <FaChevronRight className="hidden text-[10px] text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
    </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { profile, user, status } = useAuth();
  const [consultations, setConsultations] = useState<FirestoreConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setConsultations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const consultationsQuery = query(collection(db, "Consultations"), where("participants", "array-contains", user.uid));
    return onSnapshot(consultationsQuery, (snapshot) => {
      setConsultations(snapshot.docs.map((entry) => ({ ...(entry.data() as FirestoreConsultation), consultationId: entry.id })));
      setLoading(false);
    }, () => setLoading(false));
  }, [user?.uid]);

  const displayName = (profile?.fullName as string) || (profile?.name as string) || user?.displayName || "Doctor";
  const firstName = displayName.split(" ")[0];
  const verified = status === "verified";
  const { today, upcoming, past } = useMemo(() => bucketConsultations(consultations), [consultations]);
  const activeToday = today.filter((item) => !item.cancelledByDoctor && !item.videoConsultDone).sort((a, b) => a.consultationTime - b.consultationTime);
  const liveConsultation = consultations.find((item) => isLive(item, now));
  const nextConsultation = activeToday.find((item) => item.consultationTime > now);
  const completedCount = consultations.filter((item) => item.videoConsultDone).length;
  const uniquePatients = new Set(consultations.map((item) => patientName(item).trim().toLocaleLowerCase()).filter(Boolean)).size;
  const stats = [
    { label: "Today", value: today.length, icon: FaCalendarCheck, tone: "blue" },
    { label: "Upcoming", value: upcoming.length, icon: FaClock, tone: "violet" },
    { label: "Patients", value: uniquePatients, icon: FaUsers, tone: "amber" },
    { label: "Completed", value: completedCount, icon: FaCheckCircle, tone: "green" },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 lg:space-y-6" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3 pt-0.5">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{getGreeting()}</p>
          <h1 className="mt-1 truncate text-[1.65rem] font-black leading-none tracking-[-0.045em] text-slate-950 md:text-3xl">Dr. {firstName}</h1>
          <p className="mt-2 max-w-[245px] text-xs leading-5 text-slate-500 sm:max-w-none sm:text-sm">Your practice at a glance.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <DoctorNotificationBell className="lg:hidden" />
          <Link href="/doc/profile/edit/schedule" className="hidden items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:flex">
            <FaPlus className="text-xs" /> Update schedule
          </Link>
        </div>
      </motion.header>

      {liveConsultation && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Link href={`/doc/consultations/${liveConsultation.consultationId}/room`} className="doctor-tap flex items-center gap-3 rounded-2xl bg-[#102a43] p-3.5 text-white shadow-lg shadow-slate-900/10 md:px-5 md:py-4">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-300/50" /><FaVideo className="relative" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">Consultation live now</span><span className="mt-0.5 block truncate text-sm font-bold md:text-base">{patientName(liveConsultation)} is ready to see you</span></span>
            <span className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-slate-900">Join now</span>
          </Link>
        </motion.div>
      )}

      <VerificationBanner />

      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="doctor-hero-card relative overflow-hidden rounded-[26px] p-5 text-white md:rounded-3xl md:p-7">
          <HomeHeroVector />
          <div className="relative z-10 flex min-h-[205px] max-w-[68%] flex-col justify-between sm:min-h-[190px] md:max-w-[62%]">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-cyan-200"><span className={`h-1.5 w-1.5 rounded-full ${verified ? "bg-emerald-300" : "bg-amber-300"}`} />{verified ? "Practice active" : "Review in progress"}</p>
              <h2 className="mt-2 max-w-lg text-[1.45rem] font-black leading-[1.05] tracking-[-0.04em] md:text-3xl">{nextConsultation ? `Next: ${patientName(nextConsultation)}` : "You’re ready for today"}</h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-blue-100">{nextConsultation ? `${epochToTime(nextConsultation.consultationTime)} · ${nextConsultation.notesForDoctor || "General consultation"}` : verified ? "Your schedule is open for new bookings." : "Complete verification to go live."}</p>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Link href={nextConsultation ? `/doc/consultations/${nextConsultation.consultationId}` : "/doc/consultations"} className="doctor-tap inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-slate-950/10 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">{nextConsultation ? "View visit" : "View schedule"}<FaArrowRight className="text-[10px]" /></Link>
              <Link href="/doc/messages" aria-label="Open messages" className="doctor-tap grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"><FaCommentDots /></Link>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="doctor-stat-card doctor-tap flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 md:flex-col md:items-start md:gap-0 md:rounded-2xl md:p-5">
              <div className={`doctor-stat-icon doctor-stat-icon--${stat.tone} shrink-0`}><Icon /></div>
              <div className="min-w-0 md:mt-5">
                <p className="text-lg font-extrabold leading-tight tracking-tight text-slate-950 md:text-3xl"><StatValue value={stat.value} loading={loading} /></p>
                <p className="truncate text-[11px] font-semibold text-slate-500 md:mt-0.5 md:text-xs">{stat.label}</p>
              </div>
            </motion.div>;
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] md:rounded-3xl md:p-6 md:shadow-none">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-extrabold text-slate-950 md:text-lg">Today&apos;s appointments</h2><p className="mt-0.5 text-xs text-slate-500">Your clinical queue for today</p></div><Link href="/doc/consultations" className="text-xs font-bold text-primary hover:text-primary-700">View all</Link></div>
          <div className="mt-4 divide-y divide-slate-100">
            {loading ? [0, 1, 2].map((item) => <div key={item} className="flex animate-pulse items-center gap-3 px-2 py-3"><div className="h-11 w-11 rounded-xl bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-3 w-32 rounded bg-slate-100" /><div className="h-2 w-48 rounded bg-slate-100" /></div></div>) : activeToday.length > 0 ? activeToday.slice(0, 4).map((consultation, index) => <AppointmentRow key={consultation.consultationId} consultation={consultation} index={index} />) : <div className="grid min-h-48 place-items-center rounded-2xl bg-slate-50 px-6 py-8 text-center"><div><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><FaCalendarCheck /></div><p className="mt-3 text-sm font-bold text-slate-800">No appointments today</p><p className="mt-1 text-xs text-slate-500">Enjoy the clear schedule or review upcoming bookings.</p></div></div>}
          </div>
        </div>

        <aside className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] md:rounded-3xl md:p-6 md:shadow-none">
          <h2 className="text-base font-extrabold text-slate-950">Quick actions</h2><p className="mt-0.5 text-xs text-slate-500">Common practice tasks</p>
          <div className="mt-4 space-y-2">
            {[
              { href: "/doc/profile/edit/schedule", icon: FaClock, label: "Manage availability", hint: "Slots and consultation hours" },
              { href: "/doc/patients", icon: FaUsers, label: "Patient records", hint: "View history and notes" },
              { href: "/doc/consultations?tab=past", icon: FaCheckCircle, label: "Past consultations", hint: `${past.length} visit${past.length === 1 ? "" : "s"} on record` },
            ].map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div key={action.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <Link href={action.href} className="doctor-tap group flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-sm text-primary"><Icon /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">{action.label}</span><span className="block truncate text-[11px] text-slate-500">{action.hint}</span></span><FaChevronRight className="text-[10px] text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary" /></Link>
                </motion.div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}
