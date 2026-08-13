"use client";

import React from "react";
import { Spinner } from "@nextui-org/react";
import { FaStar, FaMapMarkerAlt, FaUserMd, FaChevronRight } from "react-icons/fa";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Doctor } from "@/types/doctor";
import { RemoteImage } from "@/components/ui/RemoteImage";

interface DoctorCardProps {
    doctor: Doctor;
}

import { useState } from "react";

const DoctorCardInner = ({ doctor }: DoctorCardProps) => {
    const router = useRouter();
    const [isNavigating, setIsNavigating] = useState(false);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="h-full"
        >
            <div
                onClick={() => {
                    setIsNavigating(true);
                    router.push(`/doctor/${doctor.id}`);
                }}
                className="mobile-app-card premium-card h-full p-3 md:p-6 group cursor-pointer border-none ring-1 ring-slate-100 hover:ring-primary/20 transition-all relative overflow-hidden"
            >
                {isNavigating && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-[20px] md:rounded-[40px]">
                        <Spinner size="lg" color="primary" />
                    </div>
                )}
                <div className="flex items-center gap-3 md:items-start md:gap-6">
                    <div className="relative shrink-0">
                        {/* Fixed box reserves the space before the image loads, so
                            the card never reflows as avatars stream in. */}
                        <div className="relative w-16 h-[72px] md:w-24 md:h-24 overflow-hidden rounded-[16px] md:rounded-[24px] bg-primary/5 shadow-md md:shadow-lg">
                            {doctor.profileImage ? (
                                <RemoteImage
                                    src={doctor.profileImage}
                                    alt={doctor.name}
                                    sizes="(max-width: 768px) 64px, 96px"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-primary text-xl md:text-3xl">
                                    <FaUserMd />
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 z-10 bg-primary text-white px-2 py-0.5 rounded-full text-[9px] md:text-xs font-black shadow-md border-2 border-white whitespace-nowrap">
                            ₹{doctor.consultationFees ? Number(doctor.consultationFees) + 50 : 0}
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5 md:space-y-3">
                        <div>
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="truncate text-sm md:text-xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">
                                    {doctor.specialization?.toLowerCase().includes("psycho")
                                        ? doctor.name
                                        : `Dr. ${doctor.name}`}
                                </h3>
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary md:hidden"><FaChevronRight className="text-[8px]" /></span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] font-semibold text-primary md:hidden">{doctor.specialization}</p>
                            <div className="flex items-center gap-1.5 mt-1 md:gap-2">
                                <div className="flex items-center gap-1 bg-amber-50 px-1.5 md:px-2 py-0.5 rounded-lg">
                                    <FaStar className="text-amber-500 text-[10px]" />
                                    <span className="text-[10px] font-black text-amber-700">{(doctor.averageRating || 0).toFixed(1)}</span>
                                </div>
                                <span className="truncate text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wide md:tracking-widest leading-loose">
                                    {doctor.numExp || 0} yrs exp.
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400">
                            <FaMapMarkerAlt className="shrink-0 text-[10px] md:text-xs" />
                            <span className="truncate text-[10px] md:text-xs font-bold">
                                {doctor.currentCity}, {doctor.currentState}
                            </span>
                        </div>

                        <div className="hidden sm:flex flex-wrap gap-2 pt-1">
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

export const DoctorCard = React.memo(DoctorCardInner);
