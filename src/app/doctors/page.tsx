/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select, SelectItem, Skeleton, Divider } from "@nextui-org/react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    getCountFromServer,
} from "firebase/firestore";
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

function DoctorsListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [recommendedDoctors, setRecommendedDoctors] = useState<Doctor[]>([]);
    const [specialities, setSpecialities] = useState<string[]>([]);
    const [selectedSpeciality, setSelectedSpeciality] = useState(
        searchParams.get("speciality") || "Physical Medicine and Rehabilitation"
    );
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [scoring, setScoring] = useState(false);

    // Fetch Specialities
    useEffect(() => {
        const fetchSpecialities = async () => {
            try {
                const docRef = doc(db, "Specialities", "available");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const names = data.specialityName.map((s: { name: string }) => s.name);
                    setSpecialities(names);
                }
            } catch (error) {
                console.error("Error fetching specialities:", error);
            }
        };
        fetchSpecialities();
    }, []);

    const fetchDoctorsWithScores = useCallback(async (speciality: string) => {
        setLoading(true);
        setScoring(true);
        try {
            const doctorsRef = collection(db, "Users");
            const q = query(
                doctorsRef,
                where("specialization", "==", speciality),
                where("isAccountVerified", "==", true)
            );

            const querySnapshot = await getDocs(q);
            const doctorsList: any[] = [];
            querySnapshot.forEach((doc) => {
                doctorsList.push({ id: doc.id, ...doc.data() });
            });

            // Calculate scores for each doctor (queries run in parallel)
            const scoredDoctors = await Promise.all(
                doctorsList.map(async (doctor) => {
                    const doctorUid = doctor.uid || doctor.id;

                    // Run post count and consultation count queries in parallel
                    const feedsRef = collection(db, "feeds");
                    const postsQuery = query(feedsRef, where("posterId", "==", doctorUid));

                    const consultationsRef = collection(db, "Consultations");
                    const consultsQuery = query(
                        consultationsRef,
                        where("participants", "array-contains", doctorUid)
                    );

                    const [postCountSnapshot, consultCountSnapshot] = await Promise.all([
                        getCountFromServer(postsQuery),
                        getCountFromServer(consultsQuery),
                    ]);

                    const postCount = postCountSnapshot.data().count;
                    const consultCount = consultCountSnapshot.data().count;
                    const averageRating = doctor.averageRating || 0;

                    // score = (postCount × 1) + (consultCount × 3) + (averageRating × 2)
                    const score = (postCount * 1) + (consultCount * 3) + (averageRating * 2);

                    return {
                        ...doctor,
                        postCount,
                        consultCount,
                        score
                    };
                })
            );

            // Sort by score descending for recommended
            const sortedByScore = [...scoredDoctors].sort((a, b) => b.score - a.score);
            setRecommendedDoctors(sortedByScore.slice(0, 3));

            // All doctors list
            setDoctors(scoredDoctors);
        } catch (error) {
            console.error("Error fetching doctors with scores:", error);
        } finally {
            setLoading(false);
            setScoring(false);
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
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full px-4 md:px-6 py-4">
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

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12 flex-grow">
                {/* Header Section and Filter */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <section className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            Find Your <span className="text-primary italic">Perfect Specialist.</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-lg max-w-2xl">
                            Ranked by clinical expertise, patient feedback, and active health contributions.
                        </p>
                    </section>

                    {/* Filter Dropdown */}
                    <div className="w-full md:w-80">
                        <Select
                            label="Filter by Speciality"
                            placeholder="Select a speciality"
                            selectedKeys={[selectedSpeciality]}
                            className="max-w-xs"
                            variant="bordered"
                            radius="lg" // Retained as per original, assuming "fix" means it's correct or no change needed here.
                            classNames={{
                                trigger: "bg-white border-slate-100 hover:border-primary/50 h-14",
                                label: "font-black text-slate-400 uppercase tracking-widest text-[10px]",
                                value: "font-bold text-slate-700"
                            }}
                            onSelectionChange={(keys: any) => {
                                const selected = Array.from(keys)[0] as string;
                                if (selected) handleSpecialityChange(selected);
                            }}
                        >
                            {specialities.map((name) => (
                                <SelectItem key={name} value={name} className="font-bold text-slate-600">
                                    {name}
                                </SelectItem>
                            ))}
                        </Select>
                    </div>
                </div>

                <Divider className="bg-slate-100" />

                {/* Recommended Doctors */}
                <section className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                                <FaTrophy className="text-xl" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recommended Specialists</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top 3 Ranked by Performance Score</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {loading ? (
                            [1, 2, 3].map((i) => (
                                <div key={i} className="premium-card h-64 animate-pulse bg-slate-50 border-none" />
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
                                        <div className="absolute -top-3 -left-3 z-20 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xl border-2 border-white">
                                            #{index + 1}
                                        </div>
                                        <DoctorCard doctor={doctor} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </section>

                <Divider className="bg-slate-100" />

                {/* All Doctors */}
                <section className="space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm">
                            <FaStar className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">All Specialists</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Showing all verified experts in {selectedSpeciality}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="premium-card h-48 animate-pulse bg-slate-50 border-none" />
                            ))
                        ) : (
                            doctors.map((doctor) => (
                                <DoctorCard key={doctor.id} doctor={doctor} />
                            ))
                        )}
                    </div>
                </section>
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
