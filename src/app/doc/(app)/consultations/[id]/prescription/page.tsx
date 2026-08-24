"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Chip } from "@heroui/react";
import {
  FaArrowLeft,
  FaPlus,
  FaTimes,
  FaPrescriptionBottleAlt,
  FaArrowRight,
} from "react-icons/fa";
import { useParams, useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/doctor/lib/firebase";
import { Button } from "@/doctor/components/ui/Button";
import { fetchConsultationById, type FirestoreConsultation } from "@/doctor/services/consultations";
import type { Medicine, Prescription } from "@/doctor/types/consultation";

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyMedicine(): Medicine {
  return { id: generateId(), name: "", dose: "", frequency: "", duration: "", instructions: "" };
}

const FREQUENCY_OPTIONS = [
  "Once daily", "Twice daily", "Thrice daily", "Four times daily",
  "As needed", "Before meals", "After meals", "At bedtime",
];
const DURATION_OPTIONS = [
  "3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "3 months", "Ongoing",
];

const fieldCls = "w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none transition";
const labelCls = "mb-1.5 block text-xs font-bold text-slate-600";

export default function PrescriptionBuilderPage() {
  const params = useParams<{ id: string }>();
  const router  = useRouter();
  const [consultation, setConsultation] = useState<FirestoreConsultation | null>(null);
  const storageKey = `prescription_${params.id}`;

  const [diagnosis,    setDiagnosis]    = useState("");
  const [medicines,    setMedicines]    = useState<Medicine[]>([emptyMedicine()]);
  const [advice,       setAdvice]       = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // Guard so autosave never fires before the initial load completes
  const hasLoaded = useRef(false);

  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const ctaBarRef = useRef<HTMLDivElement>(null);

  // Fetch consultation + restore draft (localStorage first, Firestore fallback)
  useEffect(() => {
    fetchConsultationById(params.id).then((c) => {
      if (c) setConsultation(c);

      let restored = false;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const draft: Partial<Prescription> = JSON.parse(raw);
          // Only use localStorage if it has real content (not the empty autosave)
          if (draft.diagnosis || draft.medicines?.some((m) => m.name)) {
            if (draft.diagnosis) setDiagnosis(draft.diagnosis);
            if (draft.medicines?.length) setMedicines(draft.medicines);
            if (draft.advice) setAdvice(draft.advice);
            if (draft.followUpDate) setFollowUpDate(draft.followUpDate);
            restored = true;
          }
        }
      } catch { /* ignore */ }

      // Fallback: load from Firestore prescription (different device / cleared storage)
      if (!restored && c?.prescription) {
        if (c.prescription.diagnosis) setDiagnosis(c.prescription.diagnosis);
        if (c.prescription.medicines?.length) setMedicines(c.prescription.medicines);
        if (c.prescription.advice) setAdvice(c.prescription.advice ?? "");
        if (c.prescription.followUpDate) setFollowUpDate(c.prescription.followUpDate ?? "");
      }

      hasLoaded.current = true;
    });
  }, [params.id, storageKey]);

  const patientName   = consultation?.extras?.patientDetails?.patientName || consultation?.patientName || "";
  const patientAge    = consultation?.extras?.patientDetails?.patientAge  || "";
  const patientGender = consultation?.extras?.patientDetails?.gender      || "";

  // Autosave working draft to localStorage (only after initial load)
  useEffect(() => {
    if (!hasLoaded.current) return;
    const draft: Partial<Prescription> = {
      appointmentId: params.id,
      patientName,
      patientAge: Number(patientAge) || 0,
      date: new Date().toISOString().split("T")[0],
      diagnosis, medicines, advice, followUpDate,
    };
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* ignore */ }
  }, [diagnosis, medicines, advice, followUpDate, params.id, storageKey, patientName, patientAge]);

  // This page's own scroll container is the shared doctor-app <main>
  // (.doctor-mobile-main from the (app) layout) — the document itself never
  // scrolls. The browser's default "scroll the focused field into view"
  // doesn't know about this page's sticky Patient Details header or its
  // fixed bottom CTA bar, so on focus it can land a field half-hidden
  // behind one of them, then the keyboard opening nudges it again — the
  // repeated correction is what read as "auto scrolling" and a glitchy
  // cursor position. This replaces that guesswork with an explicit
  // calculation, same approach already used for doctor onboarding.
  const revealFocusedField = useCallback((element: HTMLElement, behavior: ScrollBehavior = "smooth") => {
    const scrollContainer = element.closest<HTMLElement>(".doctor-mobile-main");
    if (!scrollContainer) return;

    const viewport = window.visualViewport;
    const containerRect = scrollContainer.getBoundingClientRect();
    const fieldRect = element.getBoundingClientRect();
    const stickyHeight = stickyHeaderRef.current?.offsetHeight ?? 0;
    const ctaHeight = ctaBarRef.current?.offsetHeight ?? 0;
    const visualBottom = viewport
      ? Math.min(containerRect.bottom, viewport.offsetTop + viewport.height)
      : containerRect.bottom;

    const visibleTop = containerRect.top + stickyHeight + 14;
    const visibleBottom = visualBottom - ctaHeight - 14;
    if (fieldRect.top >= visibleTop && fieldRect.bottom <= visibleBottom) return;

    const availableHeight = Math.max(80, visibleBottom - visibleTop);
    const targetTop = visibleTop + Math.max(8, (availableHeight - fieldRect.height) / 2);
    scrollContainer.scrollBy({ top: fieldRect.top - targetTop, behavior });
  }, []);

  useEffect(() => {
    const isEditableTarget = (element: HTMLElement) =>
      element.matches("input, textarea, select");

    let focusTimer: number | undefined;
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !isEditableTarget(target)) return;
      window.clearTimeout(focusTimer);
      revealFocusedField(target);
      // Keyboards animate open after focus fires — recheck once it settles,
      // otherwise the correction runs against the pre-keyboard geometry.
      focusTimer = window.setTimeout(() => revealFocusedField(target), 360);
    };

    const handleViewportChange = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && isEditableTarget(active)) {
        window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(() => revealFocusedField(active), 80);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("focusin", handleFocusIn);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, [revealFocusedField]);

  const addMedicine = () => setMedicines((p) => [...p, emptyMedicine()]);
  const removeMedicine = (id: string) => setMedicines((p) => p.filter((m) => m.id !== id));
  const updateMedicine = (id: string, field: keyof Medicine, value: string) =>
    setMedicines((p) => p.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const section = {
    hidden:  { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35 } }),
  };

  return (
    <div className="mx-auto max-w-2xl pb-40 md:pb-12">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <button
          onClick={() => router.push(`/doc/consultations/${params.id}/post`)}
          className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-primary"
        >
          <FaArrowLeft className="text-xs" /> Back
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">New Prescription</h1>
          {patientName && <Chip variant="flat" color="primary" size="sm">{patientName}</Chip>}
        </div>
      </motion.div>

      <div className="flex flex-col gap-4">

        {/* Patient Details — sticky so context is always visible while filling the form */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={section} ref={stickyHeaderRef}
          className="sticky top-0 z-20 rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <h3 className="mb-4 flex items-center gap-2 font-black tracking-tight text-slate-900">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary">
              <FaPrescriptionBottleAlt className="text-sm" />
            </div>
            Patient Details
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Patient", value: patientName || "—" },
              { label: "Age / Gender", value: patientAge ? `${patientAge} yrs${patientGender ? ` / ${patientGender}` : ""}` : "—" },
              { label: "Date", value: today },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Diagnosis */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={section}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black tracking-tight text-slate-900">Diagnosis</h3>
          <label className={labelCls}>Diagnosis / Chief Complaint</label>
          <textarea
            rows={3}
            placeholder="e.g. Acute viral pharyngitis with fever"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className={`${fieldCls} resize-none`}
          />
        </motion.div>

        {/* Medicines */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={section}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black tracking-tight text-slate-900">Medicines</h3>
            <Button size="sm" variant="flat" color="primary"
              className="rounded-full text-xs font-semibold"
              startContent={<FaPlus className="text-[10px]" />}
              onPress={addMedicine}>
              Add Medicine
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {medicines.map((med, idx) => (
              <div key={med.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Medicine {idx + 1}</span>
                  {medicines.length > 1 && (
                    <button onClick={() => removeMedicine(med.id)}
                      className="grid h-6 w-6 place-items-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100">
                      <FaTimes className="text-[10px]" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Medicine Name</label>
                    <input type="text" placeholder="e.g. Amoxicillin 500mg"
                      value={med.name}
                      onChange={(e) => updateMedicine(med.id, "name", e.target.value)}
                      className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Dose</label>
                    <input type="text" placeholder="e.g. 1 tablet / 5 ml"
                      value={med.dose}
                      onChange={(e) => updateMedicine(med.id, "dose", e.target.value)}
                      className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Frequency</label>
                    <select value={med.frequency}
                      onChange={(e) => updateMedicine(med.id, "frequency", e.target.value)}
                      className={fieldCls}>
                      <option value="">Select frequency</option>
                      {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Duration</label>
                    <select value={med.duration}
                      onChange={(e) => updateMedicine(med.id, "duration", e.target.value)}
                      className={fieldCls}>
                      <option value="">Select duration</option>
                      {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Special Instructions (optional)</label>
                    <input type="text" placeholder="e.g. Take with warm water, avoid dairy"
                      value={med.instructions ?? ""}
                      onChange={(e) => updateMedicine(med.id, "instructions", e.target.value)}
                      className={fieldCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Advice */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={section}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black tracking-tight text-slate-900">Advice / Instructions</h3>
          <label className={labelCls}>General Advice</label>
          <textarea rows={3}
            placeholder="e.g. Rest for 2 days, drink plenty of fluids, avoid cold food…"
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            className={`${fieldCls} resize-none`} />
        </motion.div>

        {/* Follow-up */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={section}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black tracking-tight text-slate-900">Follow-up</h3>
          <label className={labelCls}>Follow-up Date (optional)</label>
          <input type="date"
            value={followUpDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className={fieldCls} />
        </motion.div>
      </div>

      {/* Sticky CTA */}
      <div ref={ctaBarRef} className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] left-0 right-0 z-50 border-t border-slate-100 bg-[#F8FAFC]/95 px-4 pb-3 pt-3 backdrop-blur-sm md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button color="primary" size="lg"
          className="h-14 w-full rounded-2xl text-base font-bold text-white shadow-2xl shadow-primary/25 md:rounded-full"
          endContent={<FaArrowRight />}
          onPress={async () => {
            await updateDoc(doc(db, "Consultations", params.id), {
              prescription: {
                diagnosis,
                medicines,
                advice: advice || null,
                followUpDate: followUpDate || null,
                savedAt: Date.now(),
              },
            });
            router.push(`/doc/consultations/${params.id}/prescription/preview`);
          }}
          isDisabled={!diagnosis.trim() && medicines.every((m) => !m.name.trim())}
        >
          Save & Preview Prescription
        </Button>
      </div>
    </div>
  );
}
