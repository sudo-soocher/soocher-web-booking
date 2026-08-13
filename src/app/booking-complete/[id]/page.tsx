"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-db";
import { Button, useDisclosure } from "@heroui/react";
import {
  FaCheckCircle,
  FaClock,
  FaCalendar,
  FaVideo,
  FaUser,
  FaUserMd,
  FaComments,
  FaPhoneAlt,
  FaArrowRight,
  FaCopy,
  FaShieldAlt,
} from "react-icons/fa";
// FaStethoscope kept for navbar logo
import { Consultation } from "@/types/consultation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
// Loaded on demand: stream-chat-react + its CSS is ~350 kB and the chat is
// only ever opened after the page is already interactive.
const ChatSidebar = dynamic(
  () => import("@/components/chat/ChatSidebar").then((m) => m.ChatSidebar),
  { ssr: false }
);
import { getChatAvailability } from "@/utils/chat/availability";
import { formatDisplayDate, formatDisplayTime, getTimezoneName } from "@/utils/timezone";
import { Logo } from "@/components/ui/Logo";
import { BookingCompleteShimmer } from "@/components/loading/BookingCompleteShimmer";

export default function BookingComplete() {
  const params = useParams();
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { isOpen: isChatOpen, onOpen: onChatOpen, onClose: onChatClose } = useDisclosure();

  const handleCopyMeetLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        const consultationDoc = await getDoc(
          doc(db, "Consultations", params.id as string)
        );
        if (consultationDoc.exists()) {
          setConsultation(consultationDoc.data() as Consultation);
        }
      } catch (error) {
        console.error("Error fetching consultation:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchConsultation();
    }
  }, [params.id]);

  if (loading) {
    return <BookingCompleteShimmer />;
  }

  if (!consultation) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-4">
        <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center text-slate-300 text-3xl">
          <FaClock />
        </div>
        <p className="text-xl font-black text-slate-900">Consultation not found</p>
        <Button color="primary" onPress={() => router.push("/")}>Return Home</Button>
      </div>
    );
  }

  const reference = consultation.consultationId.slice(0, 12).toUpperCase();
  const patientName = consultation.extras?.patientDetails?.patientName || consultation.patientName;
  const chatAvailable = getChatAvailability(consultation).isAvailable;

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#F4F8FF] transition-all duration-300">
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isChatOpen ? 'md:mr-[450px]' : ''}`}>

        {/* ── Mobile Top Bar ─────────────────────────────────────── */}
        <header
          className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-2xl md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo size="sm" className="shrink-0 rounded-xl" />
              <span className="truncate text-base font-extrabold tracking-tight text-slate-900">Booking confirmed</span>
            </div>
            <button
              onClick={() => router.push("/")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500 transition-transform active:scale-90"
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label="Close confirmation"
            >
              ✕
            </button>
          </div>
        </header>

        {/* ── Desktop Navbar ─────────────────────────────────────── */}
        <header className="hidden md:block px-6 py-4">
          <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <Logo size="md" className="shadow-lg shadow-primary/20 rounded-xl" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Soocher</h1>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Confidential Ticket</p>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 md:px-6 md:py-12">
          <div className="space-y-5 md:space-y-8">
            {/* Success Message */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3 text-center"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-3xl text-white shadow-xl shadow-emerald-500/25 md:h-20 md:w-20 md:text-4xl">
                <FaCheckCircle aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-[1.75rem] font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
                  You&apos;re all set!
                </h1>
                <p className="mx-auto max-w-md text-sm leading-6 text-slate-500 md:text-base">Your consultation has been booked successfully. We&apos;ll remind you before it starts.</p>
              </div>
            </motion.div>

            {/* Consultation Ticket */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_-32px_rgba(30,64,175,0.45)]">
                <div className="relative overflow-hidden bg-gradient-to-br from-primary to-blue-700 p-5 text-white md:p-7">
                  <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10" />
                  <div className="relative flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/65">Video consultation</p>
                      <h2 className="truncate text-xl font-black tracking-tight md:text-2xl">Appointment details</h2>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white/10 px-2.5 py-2 text-right ring-1 ring-white/15">
                      <p className="text-[8px] font-extrabold uppercase tracking-widest text-white/60">Reference</p>
                      <p className="mt-0.5 font-mono text-[10px] font-bold sm:text-xs">#{reference}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-4 sm:p-5 md:p-7">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FaUserMd /></span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Doctor</p>
                        <p className="mt-0.5 break-words text-sm font-extrabold leading-5 text-slate-900">{consultation.doctorName}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><FaUser /></span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Patient</p>
                        <p className="mt-0.5 break-words text-sm font-extrabold leading-5 text-slate-900">{patientName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-y border-dashed border-slate-200 py-5 sm:grid-cols-2">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><FaCalendar /></span>
                      <div className="min-w-0">
                          <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Date &amp; time</p>
                          <p className="mt-1 break-words text-sm font-extrabold leading-5 text-slate-900">
                            {formatDisplayDate(consultation.consultationTime, consultation.timezone)}
                          </p>
                          <p className="text-sm font-bold leading-5 text-primary">
                            {formatDisplayTime(consultation.consultationTime, consultation.timezone)}
                          </p>
                          <p className="mt-0.5 break-words text-[10px] font-medium leading-4 text-slate-400">
                            {getTimezoneName(consultation.timezone)}
                          </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><FaVideo /></span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Consultation mode</p>
                        <p className="mt-1 text-sm font-extrabold text-slate-900">HD video consultation</p>
                        <p className="mt-0.5 text-[10px] font-medium leading-4 text-slate-400">Chat remains available for 24 hours</p>
                      </div>
                    </div>
                  </div>

                  {(consultation.extras?.meetLink || consultation.extras?.streamCallId || chatAvailable) && (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">

                        {/* Stream.io Video Call button */}
                        {consultation.extras?.streamCallId && (
                          <button
                            onClick={() => router.push(`/video-call/${consultation.consultationId}`)}
                            className="group flex min-h-16 min-w-0 items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-3.5 py-3 text-left transition-colors hover:bg-primary/15"
                          >
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                              <FaPhoneAlt className="text-base" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-[9px] font-extrabold uppercase tracking-widest text-primary/60">Soocher video</p>
                              <p className="break-words text-sm font-extrabold leading-5 text-primary">
                                Join Video Call
                              </p>
                            </div>
                          </button>
                        )}

                        {consultation.extras?.meetLink && (
                          <button
                            onClick={() => handleCopyMeetLink(consultation.extras.meetLink!)}
                            className={`group flex min-h-16 min-w-0 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                              copied
                                ? "bg-success/10 border-success/30"
                                : "bg-gradient-to-r from-[#1a73e8]/10 to-[#34a853]/10 border-[#1a73e8]/20 hover:from-[#1a73e8]/20 hover:to-[#34a853]/20 hover:border-[#1a73e8]/40"
                            }`}
                          >
                            {/* Official Google Meet logo from public directory */}
                            <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-white flex items-center justify-center relative">
                              <Image
                                src="/google_meet_logo.png"
                                alt="Google Meet"
                                fill
                                className="object-contain p-1.5"
                              />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Google Meet</p>
                              <p className={`break-words text-sm font-extrabold leading-5 transition-colors ${
                                copied ? "text-success" : "text-slate-800 group-hover:text-[#1a73e8]"
                              }`}>
                                {copied ? "Meeting Link Copied! ✓" : "Copy Meeting Link"}
                              </p>
                            </div>
                            <span className="shrink-0 text-slate-400">{copied ? <FaCheckCircle className="text-emerald-500" /> : <FaCopy />}</span>
                          </button>
                        )}

                        {chatAvailable && (
                          <button onClick={onChatOpen} className="group flex min-h-16 min-w-0 items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-3.5 py-3 text-left text-primary transition-colors hover:bg-primary/15">
                            <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-sm border border-primary/20 bg-white flex items-center justify-center relative text-primary">
                                <FaComments className="text-xl" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-[9px] font-extrabold uppercase tracking-widest text-primary/60">Live chat</p>
                              <p className="break-words text-sm font-extrabold leading-5">Chat with doctor</p>
                            </div>
                          </button>
                        )}
                      </div>
                  )}
                </div>
              </div>
            </motion.div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm"><FaShieldAlt /></span>
                <div className="min-w-0"><p className="text-sm font-extrabold text-slate-900">What happens next?</p><p className="mt-1 text-xs leading-5 text-slate-600">Open My bookings before the appointment to join the video call. Your booking details are saved securely.</p></div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                variant="flat"
                size="lg"
                className="h-14 rounded-2xl bg-white font-extrabold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                onPress={() => router.push("/bookings")}
              >
                View my bookings <FaArrowRight className="ml-2 text-xs" />
              </Button>
              <Button
                color="primary"
                size="lg"
                className="h-14 rounded-2xl font-extrabold !text-white shadow-xl shadow-primary/20"
                onPress={() => router.push("/")}
              >
                Book another doctor
              </Button>
            </div>


          </div>
        </main>

        <footer className="border-t border-slate-100 bg-white py-6 md:py-8">
          <div className="mx-auto max-w-2xl px-4 text-center md:px-6">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Soocher • Secure healthcare consultation
            </p>
          </div>
        </footer>
      </div>

      {/* Chat Sidebar */}
      {consultation && (
        <ChatSidebar
          isOpen={isChatOpen}
          onClose={onChatClose}
          consultation={consultation}
        />
      )}
    </div>
  );
}
