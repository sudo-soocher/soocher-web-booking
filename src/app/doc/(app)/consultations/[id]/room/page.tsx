"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaStethoscope, FaExclamationTriangle } from "react-icons/fa";
import {
  fetchConsultationById,
  type FirestoreConsultation,
} from "@/doctor/services/consultations";
import { ShimmerBlock } from "@/doctor/components/ui/DoctorShimmer";

const VideoCallRoom = dynamic(
  () => import("@/doctor/components/video/VideoCallRoom").then((m) => m.VideoCallRoom),
  { ssr: false }
);

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function VideoRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [consultation, setConsultation] = useState<FirestoreConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultationById(params.id).then((c) => {
      if (!c) setError("Consultation not found.");
      else if (!c.extras?.streamCallId) setError("Video call is not set up for this consultation yet.");
      else setConsultation(c);
      setLoading(false);
    });
  }, [params.id]);

  const patientName = consultation
    ? consultation.extras?.patientDetails?.patientName || consultation.patientName
    : "";

  const handleLeave = () => router.push(`/doc/consultations/${params.id}/post`);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628]">

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 md:px-6 border-b border-primary/10 bg-slate-950/70 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-700">
            <FaStethoscope className="text-sm text-white" />
          </div>
          <span className="text-base font-black tracking-tight text-white">Soocher</span>
          <span className="hidden rounded-full border border-primary/30 bg-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-300 sm:block">
            for Doctors
          </span>
        </div>

        {/* Patient info */}
        {patientName ? (
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[9px] font-bold uppercase tracking-widest text-primary-300/70">Patient</p>
              <p className="text-sm font-black leading-tight text-white">{patientName}</p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/40 bg-gradient-to-br from-primary/50 to-primary-700/60 text-xs font-black text-white">
              {getInitials(patientName)}
            </div>
          </div>
        ) : (
          <div className="w-9" />
        )}
      </header>

      {/* Main */}
      <main className="relative flex-1 min-h-0 overflow-hidden">
        {/* Ambient glow (always visible behind content) */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-primary/8 blur-[80px]" />
          <div className="absolute right-1/4 bottom-1/3 h-48 w-48 rounded-full bg-primary/5 blur-[60px]" />
        </div>

        {loading ? (
          <div className="grid h-full grid-rows-[1fr_auto] gap-4 p-4 md:p-6">
            <ShimmerBlock className="min-h-0 rounded-3xl opacity-20" />
            <div className="mx-auto flex items-center gap-3 rounded-full bg-white/5 p-3">
              {[0, 1, 2, 3].map((item) => (
                <ShimmerBlock key={item} className="h-11 w-11 rounded-full opacity-20" />
              ))}
            </div>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
          >
            <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-rose-500/10 ring-1 ring-rose-500/30">
              <FaExclamationTriangle className="text-3xl text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Cannot join call</h2>
              <p className="mt-2 max-w-xs text-sm text-white/50">{error}</p>
            </div>
            <button
              onClick={() => router.push(`/doc/consultations/${params.id}`)}
              className="rounded-full border border-primary/30 bg-primary/15 px-7 py-3 text-sm font-bold text-white transition-all hover:bg-primary/25"
            >
              Back to Appointment
            </button>
          </motion.div>
        ) : consultation ? (
          <VideoCallRoom consultation={consultation} onLeave={handleLeave} />
        ) : null}
      </main>
    </div>
  );
}
