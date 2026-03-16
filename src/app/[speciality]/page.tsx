/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Image } from "@nextui-org/react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  FaStar,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaUserMd,
  FaStethoscope,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/ui/Logo";

import { Doctor } from "@/types/doctor";
import { DoctorCard } from "@/components/doctor/DoctorCard";

export default function SpecialityPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localDoctors, setLocalDoctors] = useState<Doctor[]>([]);
  const [otherDoctors, setOtherDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const stateParam = searchParams.get("state");
  const cityParam = searchParams.get("city");

  const getDecodedSpeciality = useCallback(() => {
    const speciality = params.speciality as string;
    const decoded = decodeURIComponent(speciality);
    return decoded.replace(/%20/g, " ");
  }, [params.speciality]);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const doctorsRef = collection(db, "Users");
        const decodedSpeciality = getDecodedSpeciality();

        const baseQuery = query(
          doctorsRef,
          where("specialization", "==", decodedSpeciality),
          where("isAccountVerified", "==", true)
        );

        const querySnapshot = await getDocs(baseQuery);
        const doctorsList: Doctor[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Doctor, "id">;
          doctorsList.push({
            id: doc.id,
            ...data,
          });
        });

        if (stateParam && cityParam) {
          const local = doctorsList.filter(
            (doc) =>
              doc.currentState.toLowerCase() === stateParam.toLowerCase() &&
              doc.currentCity.toLowerCase() === cityParam.toLowerCase()
          );
          const others = doctorsList.filter(
            (doc) =>
              doc.currentState.toLowerCase() !== stateParam.toLowerCase() ||
              doc.currentCity.toLowerCase() !== cityParam.toLowerCase()
          );

          setLocalDoctors(local);
          setOtherDoctors(others);
        } else {
          setLocalDoctors([]);
          setOtherDoctors(doctorsList);
        }
      } catch (error) {
        console.error("Error fetching doctors:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.speciality) {
      fetchDoctors();
    }
  }, [params.speciality, stateParam, cityParam, getDecodedSpeciality]);

  const capitalizeFirstLetter = (string: string) => {
    return string
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <header className="px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
            <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
            <div className="w-24 h-6 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="premium-card h-48 animate-pulse bg-slate-50 border-none" />
          ))}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
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

      {/* Hero Section */}
      <div className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-[#F8FAFC]" />
        <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-primary/5 rounded-l-[100px] -z-10 blur-3xl opacity-50" />
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 md:space-y-6 max-w-3xl mx-auto md:mx-0"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-black text-[10px] uppercase tracking-widest mx-auto md:mx-0">
              <FaStethoscope className="text-sm" />
              Speciality Center
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-tight tracking-tight">
              Top tier <br className="hidden md:block" />
              <span className="text-primary italic">{capitalizeFirstLetter(getDecodedSpeciality())}</span> Specialists.
            </h1>
            <p className="text-base md:text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto md:mx-0">
              Connect with the most prestigious {getDecodedSpeciality().toLowerCase()} specialists, verified for excellence and patient care.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Doctors List */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-24">
        <div className="space-y-12 md:space-y-16">
          {cityParam && localDoctors.length > 0 && (
            <div className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-4">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Specialists in <span className="text-primary">{capitalizeFirstLetter(cityParam)}</span>
                </h2>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {localDoctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center gap-4">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {cityParam ? "Other Available Specialists" : `All ${capitalizeFirstLetter(getDecodedSpeciality())} Specialists`}
              </h2>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {otherDoctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>

            {localDoctors.length === 0 && otherDoctors.length === 0 && (
              <div className="py-16 md:py-24 text-center space-y-4 bg-slate-50 rounded-[32px] md:rounded-[40px] px-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-2xl md:rounded-[32px] flex items-center justify-center text-slate-300 text-2xl md:text-3xl mx-auto">
                  <FaUserMd />
                </div>
                <div>
                  <p className="text-lg md:text-xl font-black text-slate-900">No specialists found</p>
                  <p className="text-sm md:text-base text-slate-400 font-medium">Try another speciality or location.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

