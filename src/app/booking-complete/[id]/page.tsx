"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@nextui-org/react";
import {
  FaCheckCircle,
  FaClock,
  FaCalendar,
  FaVideo,
  FaUser,
  FaUserMd,
  FaStethoscope,
} from "react-icons/fa";
import { Consultation } from "@/types/consultation";
import { motion } from "framer-motion";

export default function BookingComplete() {
  const params = useParams();
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);

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
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <header className="px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
            <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
            <div className="w-24 h-6 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-12">
          <div className="premium-card h-[600px] animate-pulse bg-slate-50 border-none" />
        </main>
      </div>
    );
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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <header className="px-6 py-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <FaStethoscope className="text-white text-xl" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Soocher</h1>
          </div>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Confidential Ticket</p>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 pb-24">
        <div className="space-y-12">
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
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
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
              <div className="bg-primary p-8 text-white relative">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Session Ticket</p>
                    <h2 className="text-2xl font-black tracking-tight italic">Premium Consultation</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ref ID</p>
                    <p className="font-mono text-sm">#{consultation.consultationId.slice(0, 12).toUpperCase()}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-10 relative">
                {/* Decorative notches for ticket */}
                <div className="absolute -left-4 top-[0%] w-8 h-8 bg-[#F8FAFC] rounded-full ring-1 ring-slate-100 shadow-inner" />
                <div className="absolute -right-4 top-[0%] w-8 h-8 bg-[#F8FAFC] rounded-full ring-1 ring-slate-100 shadow-inner" />

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                      <FaUserMd className="text-xs" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Specialist</p>
                    </div>
                    <p className="text-lg font-black text-slate-900">{consultation.doctorName}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                      <FaUser className="text-xs" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Patient</p>
                    </div>
                    <p className="text-lg font-black text-slate-900 truncate">
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
                          {new Date(consultation.consultationTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm font-bold text-slate-400 leading-tight">
                          {new Date(consultation.consultationTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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

                <div className="pt-8 flex flex-col items-center space-y-4">
                  <div className="p-4 bg-slate-50 rounded-[32px] ring-1 ring-slate-100">
                    {/* Placeholder for QR Code */}
                    <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center border-4 border-slate-50 shadow-inner overflow-hidden grayscale opacity-20">
                      <FaStethoscope className="text-6xl text-slate-200" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic">Scan to Sync</p>
                </div>
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

      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center space-y-4">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] leading-loose">
            Soocher Premium Health Systems • AES-256 Encrypted
          </p>
        </div>
      </footer>
    </div>
  );
}
