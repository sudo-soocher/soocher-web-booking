"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Avatar, Chip, Divider } from "@heroui/react";
import {
  FaArrowLeft,
  FaVideo,
  FaCommentDots,
  FaStethoscope,
  FaCalendarAlt,
  FaClock,
  FaArrowRight,
  FaExternalLinkAlt,
  FaLink,
  FaPrescriptionBottleAlt,
  FaEye,
  FaStickyNote,
} from "react-icons/fa";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/doctor/components/ui/Button";
import { DoctorPageShimmer } from "@/doctor/components/ui/DoctorShimmer";
import {
  fetchConsultationById,
  epochToTime,
  epochToDateStr,
  deriveStatus,
  type FirestoreConsultation,
} from "@/doctor/services/consultations";
import { getChatAvailability } from "@/doctor/utils/chat/availability";

const ChatSidebar = dynamic(
  () => import("@/doctor/components/chat/ChatSidebar").then((m) => m.ChatSidebar),
  { ssr: false }
);

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [consultation, setConsultation] = useState<FirestoreConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetchConsultationById(params.id).then((c) => {
      if (!c) setNotFound(true);
      else setConsultation(c);
      setLoading(false);
    });
  }, [params.id]);

  const handleCopyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <DoctorPageShimmer compact />;
  }

  if (notFound || !consultation) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.push("/doc/consultations")}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-primary"
        >
          <FaArrowLeft className="text-xs" /> Back to Consultations
        </button>
        <div className="premium-card grid place-items-center gap-3 p-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-400">
            <FaStethoscope className="text-2xl" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Appointment not found</h2>
          <p className="text-sm text-slate-500">This record does not exist or has been removed.</p>
          <Button color="primary" className="mt-2 rounded-full" onPress={() => router.push("/doc/consultations")}>
            Back to Consultations
          </Button>
        </div>
      </div>
    );
  }

  const patientDetails = consultation.extras?.patientDetails;
  const patientName = patientDetails?.patientName || consultation.patientName;
  const meetLink = consultation.extras?.meetLink;
  const status = deriveStatus(consultation);
  const startTime = epochToTime(consultation.consultationTime);
  const endTime = epochToTime(consultation.consultationExpiration);
  const dateStr = epochToDateStr(consultation.consultationTime);
  const formattedDate = new Date(consultation.consultationTime).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl pb-48 md:pb-8">
      {/* Back navigation — router.back() returns to the list with the same tab
          (?tab=past, ?tab=upcoming, …) preserved. Falls back to the list root
          if there's no in-app history (direct link). */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push("/doc/consultations");
          }
        }}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-primary"
      >
        <FaArrowLeft className="text-xs" /> Back to Consultations
      </motion.button>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Appointment Detail</h1>
      </motion.div>

      {/* Patient hero card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="premium-card mb-4 p-6"
      >
        <div className="flex items-start gap-4">
          <Avatar
            name={getInitials(patientName)}
            className="h-14 w-14 shrink-0 bg-primary-100 text-lg font-bold text-primary"
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black tracking-tight text-slate-900">{patientName}</h2>
            {patientDetails && (
              <p className="mt-0.5 text-sm text-slate-500">
                {patientDetails.patientAge} yrs · {patientDetails.gender}
                {patientDetails.relationship !== "self" && (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    {patientDetails.relationship}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <Divider className="my-4" />

        {/* Consultation info grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
              <FaCalendarAlt className="text-sm" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Date</p>
              <p className="text-xs font-bold text-slate-700">{formattedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
              <FaClock className="text-sm" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Time</p>
              <p className="text-xs font-bold text-slate-700">{startTime} – {endTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meetLink ? "bg-primary-50 text-primary" : "bg-emerald-50 text-emerald-600"}`}>
              {meetLink ? <FaVideo className="text-sm" /> : <FaCommentDots className="text-sm" />}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Mode</p>
              <p className="text-xs font-bold text-slate-700">{meetLink ? "Video" : "Chat"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
              status === "completed" ? "bg-emerald-50 text-emerald-600"
              : status === "cancelled" ? "bg-rose-50 text-rose-500"
              : "bg-amber-50 text-amber-600"
            }`}>
              <div className="h-2.5 w-2.5 rounded-full bg-current" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status</p>
              <p className="text-xs font-bold capitalize text-slate-700">{status}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Google Meet link card */}
      {meetLink && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4 overflow-hidden rounded-2xl border border-primary-200 bg-primary-50 p-4"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/30">
              <FaVideo className="text-base" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-slate-900">Google Meet</p>
              <p className="text-xs text-slate-500">Secure video consultation link</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-white px-3 py-2">
            <FaLink className="shrink-0 text-xs text-primary" />
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-primary">{meetLink}</p>
            <button
              onClick={() => handleCopyLink(meetLink)}
              className="shrink-0 rounded-lg bg-primary-50 px-2 py-1 text-[10px] font-bold text-primary transition hover:bg-primary-100"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Patient notes for doctor */}
      {consultation.notesForDoctor && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="premium-card mb-4 p-6"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-50 text-primary shadow-sm">
              <FaStethoscope className="text-base" />
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">Patient Notes</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{consultation.notesForDoctor}</p>
          {consultation.attachments && consultation.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {consultation.attachments.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-primary-50 hover:text-primary"
                >
                  <FaExternalLinkAlt className="text-[10px]" /> Attachment {i + 1}
                </a>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Consultation metadata */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="premium-card mb-4 p-6"
      >
        <h3 className="mb-3 text-base font-black tracking-tight text-slate-900">Session Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Consultation ID</span>
            <span className="font-mono text-xs font-semibold text-slate-700 break-all text-right max-w-[60%]">
              {consultation.consultationId}
            </span>
          </div>
          {consultation.timezone && (
            <div className="flex justify-between">
              <span className="text-slate-500">Timezone</span>
              <span className="font-semibold text-slate-700">{consultation.timezone}</span>
            </div>
          )}
          {consultation.booking_type && (
            <div className="flex justify-between">
              <span className="text-slate-500">Booked via</span>
              <Chip size="sm" variant="flat" color="primary" className="capitalize">
                {consultation.booking_type}
              </Chip>
            </div>
          )}
          {consultation.appliedCoupon && (
            <div className="flex justify-between">
              <span className="text-slate-500">Coupon</span>
              <span className="font-semibold text-emerald-600">
                {consultation.appliedCoupon}
                {consultation.couponDiscount ? ` (−₹${consultation.couponDiscount})` : ""}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Post-consultation summary — prescription + clinical notes */}
      {(consultation.prescription || (consultation as unknown as Record<string, string>).clinicalNotes) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="premium-card mb-4 overflow-hidden p-0"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 className="text-base font-black tracking-tight text-slate-900">Post-Consultation</h3>
          </div>
          <Divider />

          {/* Prescription row */}
          {consultation.prescription && (
            <div className="flex items-center gap-3 px-6 py-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                <FaPrescriptionBottleAlt className="text-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">Prescription</p>
                <p className="truncate text-xs text-slate-500">
                  {consultation.prescription.medicines?.length ?? 0} medicine{(consultation.prescription.medicines?.length ?? 0) !== 1 ? "s" : ""} · {consultation.prescription.diagnosis || "No diagnosis"}
                </p>
              </div>
            </div>
          )}

          {/* Clinical notes row */}
          {(consultation as unknown as Record<string, string>).clinicalNotes && (
            <>
              {consultation.prescription && <Divider />}
              <div className="flex items-start gap-3 px-6 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <FaStickyNote className="text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900">Clinical Notes</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {(consultation as unknown as Record<string, string>).clinicalNotes}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* View button */}
          {consultation.prescription && (
            <div className="px-5 pb-5 pt-1">
              <button
                onClick={() => router.push(`/doc/consultations/${params.id}/prescription/preview`)}
                className="group flex w-full items-center gap-3 rounded-2xl border-2 border-primary-200 bg-primary-50 px-5 py-3.5 text-left transition-all hover:border-primary hover:bg-primary hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm group-hover:bg-primary-50">
                  <FaEye className="text-sm" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-primary group-hover:text-primary">View Prescription</p>
                  <p className="text-xs text-primary/60 group-hover:text-white/70">Tap to open the full prescription</p>
                </div>
                <FaArrowRight className="shrink-0 text-xs text-primary/50 group-hover:text-white" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Sticky CTA */}
      <div className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] left-0 right-0 z-50 flex flex-col gap-2 border-t border-slate-100 bg-[#F8FAFC]/95 px-4 pb-3 pt-3 backdrop-blur-sm md:static md:flex-row md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        {status !== "completed" && status !== "cancelled" && (
          consultation.extras?.streamCallId ? (
            <Button
              color="primary"
              size="lg"
              className="h-14 w-full rounded-2xl text-base font-bold text-white shadow-2xl shadow-primary/25 md:h-14 md:flex-1 md:rounded-full"
              startContent={<FaVideo />}
              onPress={async () => { router.push(`/doc/consultations/${params.id}/room`); }}
            >
              Join Video Call
            </Button>
          ) : meetLink ? (
            <Button
              color="primary"
              size="lg"
              className="h-14 w-full rounded-2xl text-base font-bold text-white shadow-2xl shadow-primary/25 md:h-14 md:flex-1 md:rounded-full"
              startContent={<FaVideo />}
              endContent={<FaExternalLinkAlt className="text-xs" />}
              onPress={async () => { window.open(meetLink, "_blank"); }}
            >
              Join on Google Meet
            </Button>
          ) : (
            <Button
              color="primary"
              size="lg"
              className="h-14 w-full rounded-2xl text-base font-bold text-white shadow-2xl shadow-primary/25 md:h-14 md:flex-1 md:rounded-full"
              startContent={<FaCommentDots />}
              isDisabled
            >
              Link not ready yet
            </Button>
          )
        )}


        {/* Chat CTA — opens the side-drawer chat. Only available within the
            consultation chat window (see getChatAvailability). */}
        {getChatAvailability(consultation).isAvailable && (
          <Button
            size="lg"
            variant="flat"
            color="primary"
            className="h-14 w-full rounded-2xl text-base font-bold md:h-14 md:flex-1 md:rounded-full"
            startContent={<FaCommentDots />}
            onPress={async () => setChatOpen(true)}
          >
            Chat with patient
          </Button>
        )}

        <Button
          size="lg"
          variant="bordered"
          className="h-14 w-full rounded-2xl border-2 border-slate-200 text-base font-semibold md:h-14 md:flex-1 md:rounded-full"
          endContent={<FaArrowRight className="text-xs" />}
          onPress={async () => { router.push(`/doc/consultations/${params.id}/post`); }}
        >
          Post-Consult Actions
        </Button>
      </div>

      <ChatSidebar
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        consultation={consultation}
      />
    </div>
  );
}
