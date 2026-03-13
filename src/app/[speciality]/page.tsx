"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Image, Button } from "@nextui-org/react";
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

interface Doctor {
  id: string;
  name: string;
  profileImage: string;
  aboutMe: string;
  worksAt: string;
  numExp: number;
  currentState: string;
  currentCity: string;
  consultationFees: number;
  averageRating: number;
  knownLanguages: string[];
  specialization: string;
}

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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <FaStethoscope className="text-white text-xl" />
            </div>
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
      <div className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[#F8FAFC]" />
        <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-primary/5 rounded-l-[100px] -z-10 blur-3xl opacity-50" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-black text-[10px] uppercase tracking-widest">
              <FaStethoscope className="text-sm" />
              Speciality Center
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-tight tracking-tight">
              Top tier <br />
              <span className="text-primary italic">{capitalizeFirstLetter(getDecodedSpeciality())}</span> Specialists.
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
              Connect with the most prestigious {getDecodedSpeciality().toLowerCase()} specialists, verified for excellence and patient care.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Doctors List */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <div className="space-y-16">
          {cityParam && localDoctors.length > 0 && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Specialists in <span className="text-primary">{capitalizeFirstLetter(cityParam)}</span>
                </h2>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {localDoctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} router={router} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {cityParam ? "Other Available Specialists" : `All ${capitalizeFirstLetter(getDecodedSpeciality())} Specialists`}
              </h2>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {otherDoctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} router={router} />
              ))}
            </div>

            {localDoctors.length === 0 && otherDoctors.length === 0 && (
              <div className="py-24 text-center space-y-4 bg-slate-50 rounded-[40px]">
                <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center text-slate-300 text-3xl mx-auto">
                  <FaUserMd />
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900">No specialists found</p>
                  <p className="text-slate-400 font-medium">Try another speciality or location.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const DoctorCard = ({ doctor, router }: { doctor: Doctor; router: ReturnType<typeof useRouter> }) => (
  <motion.div
    whileHover={{ y: -8 }}
    transition={{ duration: 0.3 }}
  >
    <div
      onClick={() => router.push(`/doctor/${doctor.id}`)}
      className="premium-card p-6 group cursor-pointer border-none ring-1 ring-slate-100 hover:ring-primary/20 transition-all"
    >
      <div className="flex items-start gap-6">
        <div className="relative">
          {doctor.profileImage ? (
            <Image
              src={doctor.profileImage}
              alt={doctor.name}
              className="w-24 h-24 rounded-[24px] object-cover shadow-xl group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-24 h-24 rounded-[24px] bg-primary/5 flex items-center justify-center text-primary text-3xl">
              <FaUserMd />
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 bg-white text-primary px-3 py-1 rounded-full text-xs font-black shadow-lg border border-slate-50">
            ₹{doctor.consultationFees ? Number(doctor.consultationFees) + 50 : 0}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">
              {doctor.specialization?.toLowerCase().includes("psycho")
                ? doctor.name
                : `Dr. ${doctor.name}`}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg">
                <FaStar className="text-amber-500 text-[10px]" />
                <span className="text-[10px] font-black text-amber-700">{doctor.averageRating.toFixed(1)}</span>
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
                {doctor.numExp} Years Experience
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <FaMapMarkerAlt className="text-xs" />
            <span className="text-xs font-bold truncate">
              {doctor.currentCity}, {doctor.currentState}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {(doctor.knownLanguages?.length
              ? doctor.knownLanguages.slice(0, 2)
              : ["English"]
            ).map((language, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest"
              >
                {language}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);
