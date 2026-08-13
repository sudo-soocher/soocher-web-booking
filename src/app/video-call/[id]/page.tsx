"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase-auth";
import { db } from "@/lib/firebase-db";
import { onAuthStateChanged } from "firebase/auth";
import { Consultation } from "@/types/consultation";
import dynamic from "next/dynamic";
import { FaArrowLeft, FaStethoscope, FaExclamationTriangle } from "react-icons/fa";
import { Logo } from "@/components/ui/Logo";

// The Stream video SDK is the application's largest client dependency. Do not
// download/parse it until authentication and the consultation access check have
// both succeeded.
const VideoCallRoom = dynamic(
  () => import("@/components/video/VideoCallRoom").then((module) => module.VideoCallRoom),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm font-medium text-white/50">
        Preparing secure video…
      </div>
    ),
  }
);

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.replace("/login"); return; }
      setAuthReady(true);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!authReady || !params.id) return;
    const fetchConsultation = async () => {
      try {
        const snap = await getDoc(doc(db, "Consultations", params.id as string));
        if (!snap.exists()) { setError("Consultation not found."); return; }
        const data = snap.data() as Consultation;
        if (!data.participants.includes(auth.currentUser!.uid)) {
          setError("You are not a participant in this consultation.");
          return;
        }
        if (!data.extras?.streamCallId) {
          setError("Video call is not set up for this consultation yet.");
          return;
        }
        setConsultation(data);
      } catch {
        setError("Failed to load consultation.");
      } finally {
        setLoading(false);
      }
    };
    fetchConsultation();
  }, [authReady, params.id]);

  const participantName = consultation
    ? consultation.extras?.patientDetails?.patientName || consultation.patientName
    : "";

  const handleLeave = () =>
    router.push(consultation ? `/booking-complete/${consultation.consultationId}` : "/bookings");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628]">

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 md:px-6 border-b border-primary/10 bg-slate-950/70 backdrop-blur-xl">
        <button
          onClick={() => router.push(consultation ? `/booking-complete/${consultation.consultationId}` : "/bookings")}
          className="grid h-9 w-9 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-white/70 transition-all hover:bg-primary/20 hover:text-white"
        >
          <FaArrowLeft className="text-xs" />
        </button>

        <div className="flex items-center gap-2.5">
          <Logo size="sm" className="rounded-xl" />
          <span className="text-base font-black tracking-tight text-white">Soocher</span>
          <span className="hidden rounded-full border border-primary/30 bg-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-300 sm:block">
            Video Call
          </span>
        </div>

        {participantName ? (
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-300/70">
                {consultation?.extras?.patientDetails?.patientName ? "Patient" : "Doctor"}
              </p>
              <p className="text-sm font-black leading-tight text-white">{participantName}</p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/40 bg-gradient-to-br from-primary/50 to-blue-700/60 text-xs font-black text-white">
              {getInitials(participantName)}
            </div>
          </div>
        ) : (
          <div className="w-9" />
        )}
      </header>

      {/* Main */}
      <main className="relative flex-1 min-h-0 overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-primary/8 blur-[80px]" />
          <div className="absolute right-1/4 bottom-1/3 h-48 w-48 rounded-full bg-primary/5 blur-[60px]" />
        </div>

        {loading || !authReady ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-white">
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2s]" />
              <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-blue-700 shadow-2xl shadow-primary/30">
                <FaStethoscope className="text-2xl text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-white/50">Loading consultation…</p>
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
              onClick={() => router.push("/bookings")}
              className="rounded-full border border-primary/30 bg-primary/15 px-7 py-3 text-sm font-bold text-white transition-all hover:bg-primary/25"
            >
              Back to Bookings
            </button>
          </motion.div>
        ) : consultation ? (
          <VideoCallRoom consultation={consultation} onLeave={handleLeave} />
        ) : null}
      </main>
    </div>
  );
}
