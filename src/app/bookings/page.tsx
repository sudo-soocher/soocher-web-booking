"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, useDisclosure } from "@nextui-org/react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import {
  FaVideo,
  FaStethoscope,
  FaArrowLeft,
  FaUserMd,
  FaCalendar,
  FaClock,
  FaComments,
  FaPhoneAlt,
} from "react-icons/fa";
import { Consultation } from "@/types/consultation";
import { motion } from "framer-motion";
import { Footer } from "@/components/layout/Footer";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { getChatAvailability } from "@/utils/chat/availability";
import { formatDisplayDateTime, formatDisplayDate, formatDisplayTime } from "@/utils/timezone";
import { Logo } from "@/components/ui/Logo";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export default function Bookings() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("upcoming");
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isChatOpen, onOpen: onChatOpen, onClose: onChatClose } = useDisclosure();

  useEffect(() => {
    const fetchConsultations = async () => {
      if (!auth.currentUser) {
        router.push("/login");
        return;
      }

      try {
        const consultationsRef = collection(db, "Consultations");
        const q = query(
          consultationsRef,
          where("participants", "array-contains", auth.currentUser.uid),
          orderBy("consultationTime", "desc")
        );

        const querySnapshot = await getDocs(q);
        const consultationsList: Consultation[] = [];
        querySnapshot.forEach((doc) => {
          consultationsList.push({
            ...doc.data(),
          } as Consultation);
        });

        setConsultations(consultationsList);
      } catch (error) {
        console.error("Error fetching consultations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, [router]);

  const filterConsultations = (type: "upcoming" | "active" | "past") => {
    const now = Date.now();

    switch (type) {
      case "upcoming":
        return consultations.filter(
          (consultation) => consultation.consultationTime > now
        );
      case "active":
        return consultations.filter(
          (consultation) =>
            consultation.consultationTime <= now &&
            consultation.consultationExpiration >= now
        );
      case "past":
        return consultations.filter(
          (consultation) => consultation.consultationExpiration < now
        );
      default:
        return [];
    }
  };

  const formatDateTime = (timestamp: number, timezone?: string) => {
    return formatDisplayDateTime(timestamp, timezone);
  };

  const getStatusChip = (consultation: Consultation) => {
    const now = Date.now();

    if (consultation.consultationTime > now) {
      return (
        <Chip color="primary" variant="flat">
          Upcoming
        </Chip>
      );
    } else if (consultation.consultationExpiration >= now) {
      return (
        <Chip color="success" variant="flat">
          Active
        </Chip>
      );
    } else {
      return (
        <Chip color="default" variant="flat">
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <header className="px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-4 md:px-6 py-3 border border-white/40 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
              <div className="w-24 h-6 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
          <div className="w-48 h-8 bg-slate-200 rounded-lg animate-pulse mb-8" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="premium-card h-40 animate-pulse bg-slate-100 border-none" />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col transition-all duration-300">
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isChatOpen ? 'md:mr-[450px]' : ''}`}>
        {/* Navbar */}
        <header className="sticky top-0 z-40 w-full px-4 md:px-6 py-4">
          <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-4 md:px-6 py-3 border border-white/40 shadow-sm">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <Logo size="md" className="shadow-lg shadow-primary/20 rounded-xl" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Soocher</h1>
            </div>
            <Button
              variant="flat"
              size="sm"
              className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
              startContent={<FaArrowLeft className="text-xs" />}
              onPress={() => router.push("/")}
            >
              Back
            </Button>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-24">
          <div className="space-y-8 md:space-y-12">
            {/* Page Heading */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                My <span className="text-primary italic">Consultations</span>
              </h1>
              <p className="text-sm md:text-base text-slate-500 font-medium">Keep track of your health journey and upcoming appointments.</p>
            </div>

            <div className="space-y-6 md:space-y-8">
              {/* Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Tabs
                  selectedKey={selectedTab}
                  onSelectionChange={(key: React.Key) => setSelectedTab(key as string)}
                  variant="underlined"
                  classNames={{
                    base: "w-full",
                    tabList: "gap-8 w-full relative rounded-none p-0 border-b border-slate-200",
                    cursor: "w-full bg-primary",
                    tab: "max-w-fit px-0 h-12",
                    tabContent: "group-data-[selected=true]:text-primary group-data-[selected=true]:font-bold text-slate-400 font-medium transition-all"
                  }}
                >
                  <Tab
                    key="upcoming"
                    title={
                      <div className="flex items-center gap-2">
                        <span>Upcoming</span>
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center">
                          {filterConsultations("upcoming").length}
                        </span>
                      </div>
                    }
                  />
                  <Tab
                    key="active"
                    title={
                      <div className="flex items-center gap-2">
                        <span>In-Progress</span>
                        <span className="w-5 h-5 rounded-full bg-success/10 text-success text-[10px] flex items-center justify-center">
                          {filterConsultations("active").length}
                        </span>
                      </div>
                    }
                  />
                  <Tab
                    key="past"
                    title={
                      <div className="flex items-center gap-2">
                        <span>Completed</span>
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center">
                          {filterConsultations("past").length}
                        </span>
                      </div>
                    }
                  />
                </Tabs>
              </motion.div>

              {/* List */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-6"
              >
                {filterConsultations(
                  selectedTab as "upcoming" | "active" | "past"
                ).map((consultation, index) => (
                  <motion.div
                    key={consultation.consultationId ?? `consultation-${index}`}
                    variants={itemVariants}
                  >
                    <div
                      onClick={() => {
                        setSelectedConsultation(consultation);
                        onOpen();
                      }}
                      className="premium-card p-4 md:p-8 group cursor-pointer border-none ring-1 ring-slate-100 ring-inset hover:ring-primary/20 transition-all duration-300"
                    >
                      {/* ── Mobile layout ── */}
                      <div className="flex md:hidden items-center gap-3">
                        {/* Doctor avatar */}
                        <div className="w-11 h-11 shrink-0 bg-primary/5 rounded-[14px] flex items-center justify-center text-primary text-lg group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                          <FaUserMd />
                        </div>

                        {/* Doctor name + date/time */}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors truncate">
                            {consultation.doctorName}
                          </h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <FaCalendar className="text-[9px] text-slate-400 shrink-0" />
                            <p className="text-[11px] font-bold text-slate-500 truncate">
                              {formatDisplayDate(consultation.consultationTime, consultation.timezone)}
                            </p>
                            <span className="text-slate-300 text-[9px]">·</span>
                            <p className="text-[11px] font-bold text-slate-400 truncate">
                              {formatDisplayTime(consultation.consultationTime, consultation.timezone)}
                            </p>
                          </div>
                        </div>

                        {/* Right actions: stream video + meet + chat + arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          {consultation.extras?.streamCallId && (Date.now() <= consultation.consultationExpiration) && (
                            <button
                              className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors duration-200"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                router.push(`/video-call/${consultation.consultationId}`);
                              }}
                              title="Join Video Call"
                            >
                              <FaPhoneAlt className="text-sm" />
                            </button>
                          )}

                          {consultation.extras?.meetLink && (Date.now() <= consultation.consultationExpiration) && (
                            <button
                              className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center hover:bg-success hover:text-white transition-colors duration-200"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                window.open(consultation.extras?.meetLink, "_blank");
                              }}
                              title="Join Google Meet"
                            >
                              <FaVideo className="text-sm" />
                            </button>
                          )}

                          {consultation && getChatAvailability(consultation).isAvailable && (
                            <button
                              className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors duration-200"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setSelectedConsultation(consultation);
                                onChatOpen();
                              }}
                              title="Open Chat"
                            >
                              <FaComments className="text-sm" />
                            </button>
                          )}

                          {/* Arrow */}
                          <div className="w-8 h-8 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                            <span className="text-slate-300 group-hover:text-white transition-colors text-sm">→</span>
                          </div>
                        </div>
                      </div>

                      {/* ── Desktop layout ── */}
                      <div className="hidden md:flex flex-row items-center justify-between gap-3">
                        {/* Left: Doctor + Date */}
                        <div className="flex flex-row items-center gap-8 min-w-0 flex-1">
                          {/* Doctor Info */}
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-14 h-14 shrink-0 bg-primary/5 rounded-[20px] flex items-center justify-center text-primary text-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                              <FaUserMd />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors truncate">
                                {consultation.doctorName}
                              </h3>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider truncate">
                                Patient: {consultation.extras?.patientDetails?.patientName ?? "—"}
                              </p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="w-px h-12 bg-slate-100 shrink-0" />

                          {/* Date Info */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
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
                        <div className="flex items-center gap-5 shrink-0">
                          {consultation.extras?.streamCallId && (Date.now() <= consultation.consultationExpiration) && (
                            <Button
                              color="primary"
                              variant="flat"
                              size="sm"
                              className="rounded-full font-bold px-6 h-11"
                              startContent={<FaPhoneAlt className="text-sm" />}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                router.push(`/video-call/${consultation.consultationId}`);
                              }}
                            >
                              Video&nbsp;Call
                            </Button>
                          )}

                          {consultation.extras?.meetLink && (Date.now() <= consultation.consultationExpiration) && (
                            <Button
                              color="success"
                              variant="flat"
                              size="sm"
                              className="rounded-full font-bold px-6 h-11"
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
                              className="rounded-full font-bold px-6 h-11"
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
                          <div className="flex flex-col items-center gap-1 w-[60px]">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Source</span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
                              getBookingSource(consultation) === "web"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-purple-100 text-purple-600"
                            }`}>
                              {getBookingSource(consultation)}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex flex-col items-center gap-1 w-[100px]">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Status</span>
                            {getStatusChip(consultation)}
                          </div>

                          {/* Arrow */}
                          <div className="w-11 h-11 rounded-full border-2 border-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
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
                      className="py-32 flex flex-col items-center justify-center space-y-4"
                    >
                      <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-4xl text-slate-200">
                        <FaClock />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-black text-slate-900">No appointments found</p>
                        <p className="text-slate-400 font-medium">Your {selectedTab} consultations will appear here.</p>
                      </div>
                    </motion.div>
                  )}
              </motion.div>
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
          base: "rounded-t-[32px] md:rounded-[32px] border-none shadow-2xl m-0 md:m-1 sm:m-0",
          header: "border-b border-slate-100 p-6 md:p-8",
          body: "p-6 md:p-8",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader>
                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Appointment Details</h2>
                  <p className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest italic">Reference: {selectedConsultation?.consultationId.slice(0, 8)}</p>
                </div>
              </ModalHeader>
              <ModalBody>
                {selectedConsultation && (
                  <div className="space-y-6 md:space-y-8">
                    <div className="grid grid-cols-2 gap-4 md:gap-8 p-4 md:p-6 bg-slate-50 rounded-[20px] md:rounded-[24px]">
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

                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                          <FaCalendar />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-900">Time & Date</p>
                          <p className="text-slate-500 font-medium">
                            {formatDateTime(selectedConsultation.consultationTime, selectedConsultation.timezone)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-success/10 text-success rounded-xl flex items-center justify-center">
                          <FaVideo />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-900">Video Link Duration</p>
                          <p className="text-slate-500 font-medium text-sm">
                            Available until {formatDisplayTime(selectedConsultation.consultationExpiration, selectedConsultation.timezone)}
                          </p>
                        </div>
                      </div>

                      {selectedConsultation.extras?.streamCallId && (Date.now() <= selectedConsultation.consultationExpiration) && (
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

                      {selectedConsultation.extras?.meetLink && (Date.now() <= selectedConsultation.consultationExpiration) && (
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

                    <div className="pt-4">
                      <Button
                        color="primary"
                        size="lg"
                        className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20"
                        onPress={onClose}
                      >
                        Dismiss Details
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
