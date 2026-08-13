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
import { FaExclamationTriangle } from "react-icons/fa";

// The Stream video SDK is the application's largest client dependency. Do not
// download/parse it until authentication and the consultation access check have
// both succeeded.
const VideoCallRoom = dynamic(
  () => import("@/components/video/VideoCallRoom").then((module) => module.VideoCallRoom),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-col items-center justify-center gap-5 bg-[#08111f] px-6">
        <div className="app-shimmer h-24 w-24 rounded-[30px] bg-slate-800" />
        <div className="app-shimmer h-4 w-44 rounded-full bg-slate-800" />
      </div>
    ),
  }
);

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

  const handleLeave = () =>
    router.push(consultation ? `/booking-complete/${consultation.consultationId}` : "/bookings");

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-[#08111f]">
      <main className="relative h-full overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-primary/[0.08] blur-[80px]" />
          <div className="absolute right-1/4 bottom-1/3 h-48 w-48 rounded-full bg-primary/5 blur-[60px]" />
        </div>

        {loading || !authReady ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
            <div className="app-shimmer h-24 w-24 rounded-[30px] bg-slate-800" />
            <div className="app-shimmer h-4 w-44 rounded-full bg-slate-800" />
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
              className="rounded-full border border-primary/30 bg-primary/[0.15] px-7 py-3 text-sm font-bold text-white transition-all hover:bg-primary/25"
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
