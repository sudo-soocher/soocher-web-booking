"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-db";
import { Button, useDisclosure } from "@nextui-org/react";
import {
  FaCheckCircle,
  FaClock,
  FaCalendar,
  FaVideo,
  FaUser,
  FaUserMd,
  FaComments,
  FaPhoneAlt,
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

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col transition-all duration-300">
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isChatOpen ? 'md:mr-[450px]' : ''}`}>

        {/* ── Mobile Top Bar ─────────────────────────────────────── */}
        <header
          className="md:hidden sticky top-0 z-40 bg-white/85 backdrop-blur-2xl border-b border-slate-100/60"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Logo size="sm" className="rounded-xl" />
              <span className="text-lg font-bold text-slate-900 tracking-tight">Booking Confirmed</span>
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-transform text-xs font-bold text-slate-500"
              style={{ WebkitTapHighlightColor: "transparent" }}
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

        <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-12 pb-safe-nav md:pb-24">
          <div className="space-y-8 md:space-y-12">
            {/* Success Message */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-20 h-20 bg-success/10 text-success rounded-[32px] flex items-center justify-center text-4xl mx-auto shadow-xl shadow-success/5">
                <FaCheckCircle />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                  Booking <span className="text-success italic">Confirmed.</span>
                </h1>
                <p className="text-slate-500 font-medium italic">Your sanctuary for health has been secured.</p>
              </div>
            </motion.div>

            {/* Consultation Ticket */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="premium-card overflow-hidden border-none ring-1 ring-slate-100">
                <div className="bg-primary p-6 md:p-8 text-white relative">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Session Ticket</p>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight italic">Premium Consultation</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ref ID</p>
                      <p className="font-mono text-sm">#{consultation.consultationId.slice(0, 12).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-8 md:space-y-10 relative">
                  <div className="absolute -left-4 top-[0%] w-8 h-8 bg-[#F8FAFC] rounded-full ring-1 ring-slate-100 shadow-inner" />
                  <div className="absolute -right-4 top-[0%] w-8 h-8 bg-[#F8FAFC] rounded-full ring-1 ring-slate-100 shadow-inner" />

                  <div className="grid grid-cols-2 gap-4 md:gap-8">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 md:gap-2 text-primary">
                        <FaUserMd className="text-xs" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Specialist</p>
                      </div>
                      <p className="text-base md:text-lg font-black text-slate-900">{consultation.doctorName}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 md:gap-2 text-primary">
                        <FaUser className="text-xs" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Patient</p>
                      </div>
                      <p className="text-base md:text-lg font-black text-slate-900 truncate">
                        {consultation.extras.patientDetails.patientName}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 border-t border-dashed border-slate-200" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
                          <FaCalendar />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Appointment</p>
                          <p className="font-black text-slate-900 italic">
                            {formatDisplayDate(consultation.consultationTime, consultation.timezone)}
                          </p>
                          <p className="text-sm font-bold text-slate-400 leading-tight">
                            {formatDisplayTime(consultation.consultationTime, consultation.timezone)}
                          </p>
                          <p className="text-xs font-medium text-slate-300 leading-tight mt-0.5">
                            {getTimezoneName(consultation.timezone)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-3 bg-success/5 rounded-xl text-success/60">
                          <FaVideo />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Channel</p>
                          <p className="font-black text-slate-900 italic">HD Video + Chat</p>
                          <p className="text-sm font-bold text-slate-400 leading-tight italic">
                            Active for 24 hours
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Video Call, Meet Link & Chat */}
                  {(consultation.extras?.meetLink || consultation.extras?.streamCallId || getChatAvailability(consultation).isAvailable) && (
                    <>
                      <div className="h-px border-t border-dashed border-slate-200" />
                      <div className="flex flex-col sm:flex-row items-stretch gap-3">

                        {/* Stream.io Video Call button */}
                        {consultation.extras?.streamCallId && (
                          <button
                            onClick={() => router.push(`/video-call/${consultation.consultationId}`)}
                            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group border bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40"
                          >
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                              <FaPhoneAlt className="text-base" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Soocher Video</p>
                              <p className="text-sm font-black italic text-primary group-hover:text-primary/80 transition-colors">
                                Join Video Call
                              </p>
                            </div>
                          </button>
                        )}

                        {consultation.extras?.meetLink && (
                          <button
                            onClick={() => handleCopyMeetLink(consultation.extras.meetLink!)}
                            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group border h-auto ${
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
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Google Meet</p>
                              <p className={`text-sm font-black transition-colors duration-200 italic ${
                                copied ? "text-success" : "text-slate-800 group-hover:text-[#1a73e8]"
                              }`}>
                                {copied ? "Meeting Link Copied! ✓" : "Copy Meeting Link"}
                              </p>
                            </div>
                            {copied && (
                              <div className="mr-2 text-success shrink-0">
                                <FaCheckCircle className="text-xl" />
                              </div>
                            )}
                          </button>
                        )}

                        {getChatAvailability(consultation).isAvailable && (
                          <Button
                            color="primary"
                            variant="flat"
                            className="flex-1 w-full sm:w-auto h-auto px-4 py-3 rounded-2xl transition-all duration-200 group border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary justify-start"
                            onPress={onChatOpen}
                          >
                            <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-sm border border-primary/20 bg-white flex items-center justify-center relative text-primary">
                                <FaComments className="text-xl" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Live chat</p>
                              <p className="text-sm font-black italic">Start Chat with Doctor</p>
                            </div>
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                </div>
              </div>
            </motion.div>

            {/* Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="flat"
                size="lg"
                className="h-16 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200"
                onPress={() => router.push("/bookings")}
              >
                View Consultations
              </Button>
              <Button
                color="primary"
                size="lg"
                className="h-16 rounded-2xl font-black shadow-xl shadow-primary/20"
                onPress={() => router.push("/")}
              >
                Book Another
              </Button>
            </div>


          </div>
        </main>

        <footer className="py-8 md:py-12 border-t border-slate-100 bg-white">
          <div className="max-w-2xl mx-auto px-4 md:px-6 text-center space-y-4">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] leading-loose">
              Soocher Premium Health Systems • AES-256 Encrypted
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
