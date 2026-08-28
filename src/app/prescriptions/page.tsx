"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FaArrowLeft, FaChevronRight, FaPrescriptionBottleAlt, FaUserMd } from "react-icons/fa";
import { db } from "@/lib/firebase-db";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatDisplayDate } from "@/utils/timezone";
import type { Consultation } from "@/types/consultation";

export default function PrescriptionHistoryPage() {
  const router = useRouter();
  const { user, ready: authReady } = useAuthUser();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const q = query(
      collection(db, "Consultations"),
      where("participants", "array-contains", user.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const withPrescriptions = snapshot.docs
          .map((d) => ({ ...(d.data() as Consultation), consultationId: d.id }))
          .filter((c) => !!c.prescription)
          .sort((a, b) => (b.prescription?.savedAt ?? b.consultationTime) - (a.prescription?.savedAt ?? a.consultationTime));
        setConsultations(withPrescriptions);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [authReady, user, router]);

  return (
    <div className="min-h-[100dvh] bg-[#F5F8FD]">
      <header
        className="mobile-page-header sticky top-0 z-40"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mobile-page-header-inner">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="mobile-page-title">Prescription history</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 pb-safe-nav md:py-8">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/70" />
            ))}
          </div>
        ) : consultations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white/45 py-16 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-2xl text-slate-300">
              <FaPrescriptionBottleAlt />
            </div>
            <p className="text-base font-black text-slate-900">No prescriptions yet</p>
            <p className="mt-1 max-w-xs px-4 text-xs font-medium text-slate-400">
              Prescriptions your doctor adds after a consultation will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {consultations.map((c, index) => (
              <motion.button
                key={c.consultationId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => router.push(`/prescriptions/${c.consultationId}`)}
                className="mobile-pressable flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary"><FaUserMd /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-900">{c.doctorName}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                    {c.prescription?.diagnosis || "Prescription"} · {formatDisplayDate(c.prescription?.savedAt ?? c.consultationTime, c.timezone)}
                  </span>
                </span>
                <FaChevronRight className="shrink-0 text-xs text-slate-300" />
              </motion.button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
