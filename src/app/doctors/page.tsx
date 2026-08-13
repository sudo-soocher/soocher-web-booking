/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select, SelectItem, Skeleton, Divider } from "@heroui/react";
import {
    FaArrowLeft,
    FaStethoscope,
    FaStar,
    FaTrophy,
    FaFilter,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Doctor } from "@/types/doctor";
import { DoctorCard } from "@/components/doctor/DoctorCard";
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useTranslation } from "@/i18n/LanguageProvider";
import { fetchSpecialities, getCachedSpecialities } from "@/lib/specialities";
import { fetchDoctorsBySpeciality } from "@/lib/doctors";

function DoctorsListContent() {
    const router = useRouter();
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    // Keep the hydration render deterministic; sessionStorage is only read
    // after mount because it does not exist during server rendering.
    const [specialities, setSpecialities] = useState<string[]>([]);
    // Derived — no separate state needed
    const recommendedDoctors = useMemo(
        () => [...doctors].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3),
        [doctors]
    );
    const remainingDoctors = useMemo(() => {
        const recommendedIds = new Set(recommendedDoctors.map((doctor) => doctor.id));
        return doctors.filter((doctor) => !recommendedIds.has(doctor.id));
    }, [doctors, recommendedDoctors]);
    const [selectedSpeciality, setSelectedSpeciality] = useState(
        searchParams.get("speciality") || "Physical Medicine and Rehabilitation"
    );
    const [loading, setLoading] = useState(true);

    // Fetch Specialities — shared cache, so arriving here from the home page
    // (which already read this document) costs nothing.
    useEffect(() => {
        let cancelled = false;
        const cached = getCachedSpecialities();
        if (cached) setSpecialities(cached.map((s) => s.name));

        fetchSpecialities()
            .then((data) => {
                if (!cancelled) setSpecialities(data.map((s) => s.name));
            })
            .catch((error) => console.error("Error fetching specialities:", error));
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchDoctorsWithScores = useCallback(async (speciality: string) => {
        setLoading(true);
        try {
            const doctorsList = await fetchDoctorsBySpeciality(speciality);

            // Score using fields already on the doctor document — no extra Firestore queries
            const scoredDoctors = doctorsList.map((doctor) => {
                const consultCount = (doctor.numOnline || 0) + (doctor.numOffline || 0);
                const averageRating = doctor.averageRating || 0;
                const score = consultCount * 3 + averageRating * 2;
                return { ...doctor, consultCount, score };
            });

            // recommendedDoctors is derived via useMemo — just set doctors
            setDoctors(scoredDoctors);
        } catch (error) {
            console.error("Error fetching doctors with scores:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDoctorsWithScores(selectedSpeciality);
    }, [selectedSpeciality, fetchDoctorsWithScores]);

    const handleSpecialityChange = (name: string) => {
        setSelectedSpeciality(name);
        const url = new URL(window.location.href);
        url.searchParams.set("speciality", name);
        window.history.pushState({}, "", url.toString());
    };

    return (
        <div className="mobile-app-shell min-h-[100dvh] bg-[#F8FAFC] flex flex-col">

            {/* ── Mobile Top Bar ─────────────────────────────────────── */}
            <header
                className="mobile-page-header md:hidden sticky top-0 z-50"
                style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
                <div className="mobile-page-header-inner">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <button
                            onClick={() => router.push("/")}
                            className="mobile-page-back"
                            style={{ WebkitTapHighlightColor: "transparent" }}
                            aria-label={t("nav.back")}
                        >
                            <FaArrowLeft className="text-[11px]" />
                        </button>
                        <span className="mobile-page-title">{t("doctors.title")}</span>
                    </div>
                </div>
                {/* Mobile filter strip */}
                <div className="px-4 pb-3">
                    <Select
                        aria-label={t("doctors.filterLabel")}
                        placeholder={t("doctors.filterPlaceholderShort")}
                        selectedKeys={specialities.includes(selectedSpeciality) ? [selectedSpeciality] : []}
                        size="sm"
                        variant="bordered"
                        radius="lg"
                        classNames={{
                            trigger: "h-11 rounded-2xl border-white/90 bg-white/90 px-3 shadow-[0_5px_18px_rgba(31,65,112,0.08)] backdrop-blur-xl data-[open=true]:border-primary/35 data-[open=true]:ring-4 data-[open=true]:ring-primary/5",
                            value: "truncate pr-2 text-xs font-bold text-slate-700",
                            selectorIcon: "text-primary",
                            popoverContent: "doctor-speciality-menu overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-1.5 shadow-[0_20px_55px_rgba(15,42,80,0.18)]",
                            listboxWrapper: "max-h-[min(54dvh,360px)] px-0.5 py-0.5",
                            listbox: "gap-1 p-0",
                        }}
                        onSelectionChange={(keys: any) => {
                            const selected = Array.from(keys)[0] as string;
                            if (selected) handleSpecialityChange(selected);
                        }}
                    >
                        {specialities.map((name) => (
                            <SelectItem
                                key={name}
                                textValue={name}
                                classNames={{
                                    base: "min-h-12 rounded-2xl px-3 py-2.5 data-[hover=true]:bg-blue-50 data-[focus=true]:bg-blue-50 data-[selected=true]:bg-primary/10",
                                    title: "whitespace-normal break-words text-xs font-bold leading-[1.35rem] text-slate-700",
                                    selectedIcon: "text-primary",
                                }}
                            >
                                {name}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            </header>

            {/* ── Desktop Navbar ─────────────────────────────────────── */}
            <header className="hidden md:block sticky top-0 z-50 w-full px-6 py-4">
                <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
                        <Logo size="md" className="shadow-lg shadow-primary/20 rounded-xl" />
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Soocher</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <Button variant="flat" size="sm" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium" startContent={<FaArrowLeft className="text-xs" />} onPress={() => router.push("/")}>{t("nav.backLabel")}</Button>
                    </div>
                </nav>
            </header>

            <main className="w-full max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-12 space-y-4 md:space-y-12 flex-grow pb-safe-nav md:pb-0">
                {/* Header Section and Filter - Desktop only */}
                <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <section className="space-y-4">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight">
                            {t("doctors.heroTitle")} <span className="text-primary italic">{t("doctors.heroTitleAccent")}</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-lg max-w-2xl">
                            {t("doctors.heroSubtitle")}
                        </p>
                    </section>
                    <div className="w-80">
                        <Select
                            label={t("doctors.filterLabel")}
                            placeholder={t("doctors.filterPlaceholder")}
                            selectedKeys={specialities.includes(selectedSpeciality) ? [selectedSpeciality] : []}
                            variant="bordered"
                            radius="lg"
                            classNames={{
                                trigger: "h-14 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-primary/50 data-[open=true]:border-primary/50 data-[open=true]:ring-4 data-[open=true]:ring-primary/5",
                                label: "text-[10px] font-black uppercase tracking-widest text-slate-400",
                                value: "truncate pr-2 font-bold text-slate-700",
                                selectorIcon: "text-primary",
                                popoverContent: "doctor-speciality-menu overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-1.5 shadow-[0_20px_55px_rgba(15,42,80,0.18)]",
                                listboxWrapper: "max-h-[min(55dvh,420px)] px-0.5 py-0.5",
                                listbox: "gap-1 p-0",
                            }}
                            onSelectionChange={(keys: any) => { const selected = Array.from(keys)[0] as string; if (selected) handleSpecialityChange(selected); }}
                        >
                            {specialities.map((name) => (
                                <SelectItem
                                    key={name}
                                    textValue={name}
                                    classNames={{
                                        base: "min-h-12 rounded-2xl px-3 py-2.5 data-[hover=true]:bg-blue-50 data-[focus=true]:bg-blue-50 data-[selected=true]:bg-primary/10",
                                        title: "whitespace-normal break-words text-sm font-bold leading-5 text-slate-700",
                                        selectedIcon: "text-primary",
                                    }}
                                >
                                    {name}
                                </SelectItem>
                            ))}
                        </Select>
                    </div>
                </div>

                <Divider className="hidden md:block bg-slate-100" />

                {/* Recommended Doctors */}
                <section className="space-y-3 md:space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                                <FaTrophy className="text-sm md:text-xl" />
                            </div>
                            <div>
                                <h2 className="text-base md:text-2xl font-black text-slate-900 tracking-tight">{t("doctors.topSpecialists")}</h2>
                                <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider md:tracking-widest">{t("doctors.recommendedForYou")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-8">
                        {loading ? (
                            [1, 2, 3].map((i) => (
                                <div key={i} className="mobile-app-card premium-card app-shimmer h-24 md:h-64 border-none" />
                            ))
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {recommendedDoctors.map((doctor, index) => (
                                    <motion.div
                                        key={doctor.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="relative"
                                    >
                                        <div className="absolute -top-1.5 -left-1 z-20 w-6 h-6 md:-top-3 md:-left-3 md:w-8 md:h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-[9px] md:text-xs shadow-md md:shadow-xl border-2 border-white">
                                            #{index + 1}
                                        </div>
                                        <DoctorCard doctor={doctor} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </section>

                {(loading || remainingDoctors.length > 0) && (
                  <>
                    <Divider className="bg-slate-200/60 md:bg-slate-100" />

                    {/* All Doctors */}
                    <section className="space-y-3 md:space-y-8">
                    <div className="flex items-center gap-2.5 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm">
                            <FaStar className="text-sm md:text-xl" />
                        </div>
                        <div>
                            <h2 className="text-base md:text-2xl font-black text-slate-900 tracking-tight">{t("doctors.allSpecialists")}</h2>
                            <p className="line-clamp-2 max-w-[260px] break-words text-[9px] font-bold leading-4 text-slate-400 md:max-w-none md:text-xs md:uppercase md:tracking-widest">{t("doctors.verifiedIn", { speciality: selectedSpeciality })}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-8">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="mobile-app-card premium-card app-shimmer h-24 md:h-48 border-none" />
                            ))
                        ) : (
                            remainingDoctors.map((doctor) => (
                                <DoctorCard key={doctor.id} doctor={doctor} />
                            ))
                        )}
                    </div>
                    </section>
                  </>
                )}
            </main>

            <Footer />
        </div>
    );
}

export default function DoctorsListPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <DoctorsListContent />
        </Suspense>
    );
}
