"use client";

import { Image } from "@nextui-org/react";
import { FaStar, FaMapMarkerAlt, FaUserMd } from "react-icons/fa";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Doctor } from "@/types/doctor";

interface DoctorCardProps {
    doctor: Doctor;
}

export const DoctorCard = ({ doctor }: DoctorCardProps) => {
    const router = useRouter();

    return (
        <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
        >
            <div
                onClick={() => router.push(`/doctor/${doctor.id}`)}
                className="premium-card p-4 md:p-6 group cursor-pointer border-none ring-1 ring-slate-100 hover:ring-primary/20 transition-all"
            >
                <div className="flex items-start gap-4 md:gap-6">
                    <div className="relative">
                        {doctor.profileImage ? (
                            <Image
                                src={doctor.profileImage}
                                alt={doctor.name}
                                className="w-24 h-24 rounded-[24px] object-cover shadow-xl group-hover:scale-105 transition-transform duration-500 font-sans"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-[24px] bg-primary/5 flex items-center justify-center text-primary text-3xl">
                                <FaUserMd />
                            </div>
                        )}
                        <div className="absolute -bottom-2 -right-2 z-10 bg-white text-primary px-3 py-1 rounded-full text-xs font-black shadow-lg border border-slate-50">
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
                                    <span className="text-[10px] font-black text-amber-700">{(doctor.averageRating || 0).toFixed(1)}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
                                    {doctor.numExp || 0} Years Experience
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
};
