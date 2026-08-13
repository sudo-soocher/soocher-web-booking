"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip, Modal, ModalContent, ModalHeader, ModalBody, useDisclosure } from "@nextui-org/react";
import { db } from "@/lib/firebase-db";
import { useAuthUser } from "@/hooks/useAuthUser";
import { collection, query, where, onSnapshot, orderBy, limit, getDocsFromCache } from "firebase/firestore";
import {
  FaVideo,
  FaArrowLeft,
  FaUserMd,
  FaCalendar,
  FaClock,
  FaComments,
  FaPhoneAlt,
} from "react-icons/fa";
import { Consultation } from "@/types/consultation";
import { AnimatePresence, motion } from "framer-motion";
import { Footer } from "@/components/layout/Footer";
import dynamic from "next/dynamic";
// Loaded on demand: stream-chat-react + its CSS is ~350 kB and the chat is
// only ever opened after the page is already interactive.
const ChatSidebar = dynamic(
  () => import("@/components/chat/ChatSidebar").then((m) => m.ChatSidebar),
  { ssr: false }
);
import { getChatAvailability } from "@/utils/chat/availability";
import { formatDisplayDateTime, formatDisplayDate, formatDisplayTime } from "@/utils/timezone";
import { Logo } from "@/components/ui/Logo";
import { BookingsShimmer } from "@/components/loading/BookingsShimmer";
import { getCachedBookings, setCachedBookings } from "@/lib/bookings-cache";

export default function Bookings() {
  const router = useRouter();
  const { user, ready: authReady } = useAuthUser();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("upcoming");
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isChatOpen, onOpen: onChatOpen, onClose: onChatClose } = useDisclosure();

  useEffect(() => {
    // Wait for Firebase to restore the persisted session. Redirecting on a bare
    // `auth.currentUser` check bounces signed-in users to /login on every cold load.
    if (!authReady) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const consultationsRef = collection(db, "Consultations");
    const q = query(
      consultationsRef,
      where("participants", "array-contains", user.uid),
      orderBy("consultationTime", "desc"),
      // Keep the initial realtime payload bounded. Thirty appointments covers
      // the useful recent history while avoiding a heavy 50-card cold render.
      limit(30)
    );

    // Paint revisits from memory immediately. Firestore's local cache is the
    // second choice; the live listener below always refreshes in background.
    const memoryCached = getCachedBookings(user.uid);
    if (memoryCached) {
      setConsultations(memoryCached);
      setLoading(false);
    } else {
      void getDocsFromCache(q)
        .then((snapshot) => {
          if (snapshot.empty) return;
          const cached = snapshot.docs.map(
            (bookingDoc) => bookingDoc.data() as Consultation
          );
          setCachedBookings(user.uid, cached);
          setConsultations(cached);
          setLoading(false);
        })
        .catch(() => {
          // A cold Firestore cache is normal; the listener handles the fetch.
        });
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const consultationsList: Consultation[] = [];
        snapshot.forEach((doc) => {
          consultationsList.push({ ...doc.data() } as Consultation);
        });
        setCachedBookings(user.uid, consultationsList);
        setConsultations(consultationsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching consultations:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authReady, user, router]);

  const groupedConsultations = useMemo(() => {
    const now = Date.now();
    return consultations.reduce(
      (groups, consultation) => {
        if (consultation.videoConsultDone || consultation.consultationExpiration < now) {
          groups.past.push(consultation);
        } else if (consultation.consultationTime <= now) {
          groups.active.push(consultation);
        } else {
          groups.upcoming.push(consultation);
        }
        return groups;
      },
      { upcoming: [], active: [], past: [] } as Record<"upcoming" | "active" | "past", Consultation[]>
    );
  }, [consultations]);

  const filterConsultations = (type: "upcoming" | "active" | "past") =>
    groupedConsultations[type];

  const formatDateTime = (timestamp: number, timezone?: string) => {
    return formatDisplayDateTime(timestamp, timezone);
  };

  const getStatusChip = (consultation: Consultation) => {
    const now = Date.now();

    if (consultation.cancelledByDoctor) {
      return <Chip size="sm" className="h-6 border border-rose-100 bg-rose-50 text-[9px] font-extrabold text-rose-600">Cancelled</Chip>;
    } else if (consultation.videoConsultDone) {
      return (
        <Chip size="sm" className="h-6 border border-slate-200 bg-slate-100 text-[9px] font-extrabold text-slate-500">
          Completed
        </Chip>
      );
    } else if (consultation.consultationTime > now) {
      return (
        <Chip size="sm" className="h-6 border border-blue-100 bg-blue-50 text-[9px] font-extrabold text-primary">
          Upcoming
        </Chip>
      );
    } else if (consultation.consultationExpiration >= now) {
      return (
        <Chip size="sm" className="h-6 border border-emerald-100 bg-emerald-50 text-[9px] font-extrabold text-emerald-600">
          Active
        </Chip>
      );
    } else {
      return (
        <Chip size="sm" className="h-6 border border-slate-200 bg-slate-100 text-[9px] font-extrabold text-slate-500">
          Completed
        </Chip>
      );
    }
  };

  const getBookingSource = (consultation: Consultation): "web" | "app" => {
    if (consultation.booking_type === "web") return "web";
    if (consultation.extras?.meetLink) return "web";
    return "app";
  };

  // Same component the route-level loading.tsx renders, so the tap-to-content
  // transition is one continuous placeholder rather than two different ones.
  if (loading) {
    return <BookingsShimmer />;
  }

  return (
    <div className="mobile-app-shell relative min-h-[100dvh] overflow-hidden bg-[#F5F8FD] flex flex-col transition-all duration-300">
      <div className="pointer-events-none fixed -left-32 top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-32 bottom-20 h-96 w-96 rounded-full bg-cyan-200/20 blur-3xl" />
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isChatOpen ? 'md:mr-[450px]' : ''}`}>

        {/* ── Mobile Top Bar ───────────────────────────────────────── */}
        <header
          className="mobile-page-header md:hidden sticky top-0 z-40"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="mobile-page-header-inner">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                onClick={() => router.push("/")}
                className="mobile-page-back"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Go back"
              >
                <FaArrowLeft className="text-[11px]" />
              </button>
              <span className="mobile-page-title">My Bookings</span>
            </div>
          </div>
        </header>

        {/* ── Desktop Navbar ───────────────────────────────────────── */}
        <header className="hidden md:block sticky top-0 z-40 w-full px-6 py-4">
          <nav className="max-w-7xl mx-auto flex justify-between items-center rounded-[22px] bg-white/[0.78] backdrop-blur-2xl px-5 py-2.5 border border-white/90 shadow-[0_12px_36px_rgba(46,109,212,0.09)]">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <Logo size="md" className="shadow-md shadow-primary/15 rounded-xl" />
              <div><h1 className="text-xl font-black leading-none tracking-tight text-slate-900">Soocher</h1><p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-primary">Healthcare, simplified</p></div>
            </div>
            <Button variant="flat" size="sm" className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold" startContent={<FaArrowLeft className="text-xs" />} onPress={() => router.push("/")}>Back home</Button>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-9 pb-safe-nav md:pb-24">
          <div className="space-y-4 md:space-y-8">
            {/* Page Heading - desktop only (mobile has it in top bar) */}
            <div className="hidden md:flex items-end justify-between gap-6 rounded-[28px] border border-white/90 bg-white/55 p-7 shadow-[0_18px_50px_rgba(46,109,212,0.07)] backdrop-blur-xl">
              <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">Your care journey</p>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                My consultations
              </h1>
              <p className="text-sm text-slate-500 font-medium">View appointments, join consultations, and chat with your doctor.</p>
              </div>
              <Button color="primary" className="h-11 rounded-xl px-6 font-black shadow-lg shadow-primary/15" onPress={() => router.push("/doctors")}>Book new consultation</Button>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { key: "upcoming", label: "Upcoming", count: filterConsultations("upcoming").length, tone: "bg-blue-50 text-primary border-blue-100" },
                { key: "active", label: "Active", count: filterConsultations("active").length, tone: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { key: "past", label: "Completed", count: filterConsultations("past").length, tone: "bg-slate-100 text-slate-600 border-slate-200" },
              ].map((item) => (
                <button key={item.key} onClick={() => setSelectedTab(item.key)} className={`mobile-pressable relative overflow-hidden rounded-2xl border p-2.5 text-left shadow-sm transition-all duration-300 md:p-4 ${selectedTab === item.key ? `${item.tone} border-transparent shadow-[0_12px_28px_rgba(46,109,212,0.10)]` : "border-white/90 bg-white/65 text-slate-500 hover:bg-white/85"}`}>
                  {selectedTab === item.key && <motion.span layoutId="booking-filter-glow" className="absolute inset-0 bg-gradient-to-br from-white/55 to-transparent" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className="relative block text-lg md:text-2xl font-black leading-none">{item.count}</span>
                  <span className="relative mt-1 block truncate text-[9px] md:text-xs font-extrabold">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between px-1">
                <div><h2 className="text-sm md:text-lg font-black text-slate-900">{selectedTab === "upcoming" ? "Upcoming appointments" : selectedTab === "active" ? "Consultations in progress" : "Consultation history"}</h2><p className="mt-0.5 text-[9px] md:text-[10px] font-semibold text-slate-400">{filterConsultations(selectedTab as "upcoming" | "active" | "past").length} {filterConsultations(selectedTab as "upcoming" | "active" | "past").length === 1 ? "appointment" : "appointments"}</p></div>
                {selectedTab === "upcoming" && <Button size="sm" variant="flat" color="primary" className="hidden md:flex rounded-xl font-bold" onPress={() => router.push("/doctors")}>New booking</Button>}
              </div>
              {/* List */}
              <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selectedTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="grid grid-cols-1 gap-3 md:gap-4"
              >
                {filterConsultations(
                  selectedTab as "upcoming" | "active" | "past"
                ).map((consultation, index) => (
                  <motion.div
                    key={consultation.consultationId ?? `consultation-${index}`}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.985 }}
                    transition={{ duration: 0.14 }}
                    whileHover={{ y: -2 }}
                  >
                    <div
                      onClick={() => {
                        setSelectedConsultation(consultation);
                        onOpen();
                      }}
                      className="mobile-app-card premium-card relative group cursor-pointer overflow-hidden border border-white/90 bg-gradient-to-br from-white/[0.88] to-white/[0.66] p-3.5 shadow-[0_12px_32px_rgba(46,109,212,0.08)] backdrop-blur-xl transition-all duration-300 hover:border-primary/25 hover:shadow-[0_18px_45px_rgba(46,109,212,0.12)] md:p-5"
                    >
                      <span className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full ${selectedTab === "active" ? "bg-emerald-400" : selectedTab === "past" ? "bg-slate-300" : "bg-primary"}`} />
                      <div className="pointer-events-none absolute -right-12 -top-14 h-28 w-28 rounded-full bg-primary/5 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                      {/* ── Mobile layout ── */}
                      <div className="md:hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-blue-100 bg-blue-50 text-lg text-primary shadow-sm"><FaUserMd /></div>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black tracking-tight text-slate-900">{consultation.doctorName}</h3>
                              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-slate-400">Patient: {consultation.extras?.patientDetails?.patientName ?? "—"}</p>
                            </div>
                          </div>
                          {getStatusChip(consultation)}
                        </div>

                        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border border-white bg-slate-50/80 p-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs text-primary shadow-sm"><FaCalendar /></span>
                            <div className="min-w-0"><p className="truncate text-[11px] font-black text-slate-700">{formatDisplayDate(consultation.consultationTime, consultation.timezone)}</p><p className="mt-0.5 text-[9px] font-bold text-slate-400">{formatDisplayTime(consultation.consultationTime, consultation.timezone)}</p></div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider ${getBookingSource(consultation) === "web" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600"}`}>{getBookingSource(consultation)}</span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          {consultation.extras?.streamCallId && !consultation.videoConsultDone && (Date.now() <= consultation.consultationExpiration) && (
                            <button
                              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-[10px] font-extrabold text-white shadow-md shadow-primary/15"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                router.push(`/video-call/${consultation.consultationId}`);
                              }}
                              title="Join Video Call"
                            >
                              <FaPhoneAlt className="text-xs" /> Join call
                            </button>
                          )}

                          {consultation.extras?.meetLink && !consultation.videoConsultDone && (Date.now() <= consultation.consultationExpiration) && (
                            <button
                              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 text-[10px] font-extrabold text-emerald-600"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                window.open(consultation.extras?.meetLink, "_blank");
                              }}
                              title="Join Google Meet"
                            >
                              <FaVideo className="text-xs" /> Join meet
                            </button>
                          )}

                          {consultation && getChatAvailability(consultation).isAvailable && (
                            <button
                              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-50 text-[10px] font-extrabold text-primary"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setSelectedConsultation(consultation);
                                onChatOpen();
                              }}
                              title="Open Chat"
                            >
                              <FaComments className="text-xs" /> Chat
                            </button>
                          )}

                          <div className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-xs text-slate-400 shadow-sm">→</div>
                        </div>
                      </div>

                      {/* ── Desktop layout ── */}
                      <div className="hidden md:flex flex-row items-center justify-between gap-4">
                        {/* Left: Doctor + Date */}
                        <div className="grid min-w-0 flex-1 grid-cols-[minmax(220px,1fr)_minmax(170px,0.7fr)] items-center gap-5">
                          {/* Doctor Info */}
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-14 h-14 shrink-0 border border-blue-100 bg-blue-50 rounded-[18px] flex items-center justify-center text-primary text-xl shadow-sm">
                              <FaUserMd />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors truncate">
                                {consultation.doctorName}
                              </h3>
                              <p className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                Patient: {consultation.extras?.patientDetails?.patientName ?? "—"}
                              </p>
                            </div>
                          </div>

                          {/* Date Info */}
                          <div className="flex items-center gap-3 rounded-2xl border border-white bg-slate-50/80 p-3">
                            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                              <FaCalendar className="text-base" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">
                                {formatDisplayDate(consultation.consultationTime, consultation.timezone)}
                              </p>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {formatDisplayTime(consultation.consultationTime, consultation.timezone)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions + Source + Status + Arrow */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {consultation.extras?.streamCallId && !consultation.videoConsultDone && (Date.now() <= consultation.consultationExpiration) && (
                            <Button
                              color="primary"
                              variant="flat"
                              size="sm"
                              className="rounded-xl font-bold px-4 h-10"
                              startContent={<FaPhoneAlt className="text-sm" />}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                router.push(`/video-call/${consultation.consultationId}`);
                              }}
                            >
                              Video&nbsp;Call
                            </Button>
                          )}

                          {consultation.extras?.meetLink && !consultation.videoConsultDone && (Date.now() <= consultation.consultationExpiration) && (
                            <Button
                              color="success"
                              variant="flat"
                              size="sm"
                              className="rounded-xl font-bold px-4 h-10"
                              startContent={<FaVideo className="text-sm" />}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                window.open(consultation.extras?.meetLink, "_blank");
                              }}
                            >
                              Google&nbsp;Meet
                            </Button>
                          )}

                          {consultation && getChatAvailability(consultation).isAvailable && (
                            <Button
                              color="primary"
                              variant="flat"
                              size="sm"
                              className="rounded-xl font-bold px-4 h-10"
                              startContent={<FaComments className="text-sm" />}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setSelectedConsultation(consultation);
                                onChatOpen();
                              }}
                            >
                              Chat
                            </Button>
                          )}

                          {/* Source */}
                          <div className="hidden xl:flex flex-col items-center gap-1 w-[60px]">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Source</span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
                              getBookingSource(consultation) === "web"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-purple-100 text-purple-600"
                            }`}>
                              {getBookingSource(consultation)}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex flex-col items-center gap-1 w-[82px]">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Status</span>
                            {getStatusChip(consultation)}
                          </div>

                          {/* Arrow */}
                          <div className="w-10 h-10 rounded-xl border border-slate-100 bg-white flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
                            <span className="text-slate-300 group-hover:text-white transition-colors text-lg">→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filterConsultations(selectedTab as "upcoming" | "active" | "past")
                  .length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-[28px] border border-dashed border-slate-200 bg-white/45 py-16 md:py-24 flex flex-col items-center justify-center space-y-4"
                    >
                      <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-4xl text-slate-200">
                        <FaClock />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-black text-slate-900">No appointments found</p>
                        <p className="text-slate-400 font-medium">Your {selectedTab} consultations will appear here.</p>
                      </div>
                      <Button color="primary" variant="flat" className="rounded-xl font-bold" onPress={() => router.push("/doctors")}>Find a specialist</Button>
                    </motion.div>
                  )}
              </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Appointment Details Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        placement="bottom-center"
        classNames={{
          backdrop: "bg-slate-900/40 backdrop-blur-sm",
          base: "rounded-t-[28px] md:rounded-[28px] border border-white/80 bg-[#F8FAFC] shadow-2xl m-0 md:m-1 sm:m-0",
          header: "border-b border-white bg-white/65 p-5 md:p-6",
          body: "p-4 md:p-6",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader>
                <div className="space-y-1">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-primary">Consultation overview</p>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Appointment details</h2>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reference: {selectedConsultation?.consultationId.slice(0, 8)}</p>
                </div>
              </ModalHeader>
              <ModalBody>
                {selectedConsultation && (
                  <div className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-2 gap-3 md:gap-5 p-3.5 md:p-5 bg-white/70 border border-white rounded-[20px] shadow-sm">
                      <div className="space-y-1 md:space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Doctor</p>
                        <p className="text-sm md:text-base font-black text-slate-900">{selectedConsultation.doctorName}</p>
                      </div>
                      <div className="space-y-1 md:space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Patient</p>
                        <p className="text-sm md:text-base font-black text-slate-900 font-bold">{selectedConsultation.extras?.patientDetails?.patientName ?? "—"}</p>
                      </div>
                      <div className="space-y-1 md:space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Booked Via</p>
                        <span className={`inline-block text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                          getBookingSource(selectedConsultation) === "web"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-purple-100 text-purple-600"
                        }`}>
                          {getBookingSource(selectedConsultation)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 rounded-2xl border border-white bg-white/60 p-3">
                        <div className="w-9 h-9 shrink-0 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                          <FaCalendar />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-900">Time & Date</p>
                          <p className="text-slate-500 font-medium">
                            {formatDateTime(selectedConsultation.consultationTime, selectedConsultation.timezone)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-2xl border border-white bg-white/60 p-3">
                        <div className="w-9 h-9 shrink-0 bg-success/10 text-success rounded-xl flex items-center justify-center">
                          <FaVideo />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-900">Video Link Duration</p>
                          <p className="text-slate-500 font-medium text-sm">
                            Available until {formatDisplayTime(selectedConsultation.consultationExpiration, selectedConsultation.timezone)}
                          </p>
                        </div>
                      </div>

                      {selectedConsultation.extras?.streamCallId && !selectedConsultation.videoConsultDone && (Date.now() <= selectedConsultation.consultationExpiration) && (
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                              <FaPhoneAlt className="text-xs" />
                            </div>
                            <p className="text-sm font-bold text-primary">Soocher Video is ready</p>
                          </div>
                          <Button
                            color="primary"
                            size="sm"
                            className="rounded-xl font-bold"
                            onPress={() => router.push(`/video-call/${selectedConsultation.consultationId}`)}
                          >
                            Join Video
                          </Button>
                        </div>
                      )}

                      {selectedConsultation.extras?.meetLink && !selectedConsultation.videoConsultDone && (Date.now() <= selectedConsultation.consultationExpiration) && (
                        <div className="p-4 bg-success/5 border border-success/10 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success">
                              <FaVideo className="text-xs" />
                            </div>
                            <p className="text-sm font-bold text-success">Google Meet is ready</p>
                          </div>
                          <Button
                            color="success"
                            size="sm"
                            className="rounded-xl font-bold"
                            onPress={() => window.open(selectedConsultation.extras?.meetLink, "_blank")}
                          >
                            Join Now
                          </Button>
                        </div>
                      )}

                      {selectedConsultation && getChatAvailability(selectedConsultation).isAvailable && (
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                              <FaComments className="text-xs" />
                            </div>
                            <p className="text-sm font-bold text-primary">Chat is active</p>
                          </div>
                          <Button
                            color="primary"
                            size="sm"
                            className="rounded-xl font-bold"
                            onPress={() => {
                              onClose();
                              onChatOpen();
                            }}
                          >
                            Open Chat
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <Button
                        color="primary"
                        size="lg"
                        className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/15"
                        onPress={onClose}
                      >
                        Close details
                      </Button>
                    </div>
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Chat Sidebar */}
      {selectedConsultation && (
        <ChatSidebar
          isOpen={isChatOpen}
          onClose={onChatClose}
          consultation={selectedConsultation}
        />
      )}
    </div>
  );
}
