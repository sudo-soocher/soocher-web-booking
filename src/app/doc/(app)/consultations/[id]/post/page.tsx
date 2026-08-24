"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Divider } from "@heroui/react";
import {
  FaCheckCircle,
  FaPrescriptionBottleAlt,
  FaStickyNote,
  FaCalendarPlus,
  FaArrowRight,
  FaCheck,
  FaEye,
  FaEdit,
} from "react-icons/fa";
import { useParams, useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/doctor/lib/firebase";
import { Button } from "@/doctor/components/ui/Button";
import { DoctorPageShimmer } from "@/doctor/components/ui/DoctorShimmer";
import { fetchConsultationById, type FirestoreConsultation } from "@/doctor/services/consultations";

export default function PostConsultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [consultation, setConsultation] = useState<FirestoreConsultation | null>(null);
  const [loading, setLoading] = useState(true);

  const [notesOpen, setNotesOpen] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpSaved, setFollowUpSaved] = useState(false);

  useEffect(() => {
    fetchConsultationById(params.id).then((c) => {
      if (c) {
        setConsultation(c);
        const data = c as unknown as Record<string, string>;
        if (data.clinicalNotes) { setClinicalNotes(data.clinicalNotes); setNotesSaved(true); }
        if (data.followUpDate) { setFollowUpDate(data.followUpDate); setFollowUpSaved(true); }
      }
      setLoading(false);
    });
  }, [params.id]);

  const patientName =
    consultation?.extras?.patientDetails?.patientName ||
    consultation?.patientName ||
    "Patient";

  // "Post-Consult Actions" is a permanent shortcut on the consultation detail
  // page, reachable at any time — not only after the session has actually
  // ended (via the room's "Leave" button or the expiration window passing).
  // The header must reflect which case this is, instead of always claiming
  // the consultation already ended.
  const hasEnded = Boolean(
    consultation?.videoConsultDone ||
      (consultation && Date.now() > consultation.consultationExpiration)
  );

  const handleSaveNotes = async () => {
    await updateDoc(doc(db, "Consultations", params.id), { clinicalNotes });
    setNotesSaved(true);
  };

  const handleSaveFollowUp = async () => {
    await updateDoc(doc(db, "Consultations", params.id), { followUpDate });
    setFollowUpSaved(true);
  };

  const handleComplete = async () => {
    await updateDoc(doc(db, "Consultations", params.id), {
      videoConsultDone: true,
      actualEndTime: Date.now(),
    });
    router.push("/doc/consultations");
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
  };

  if (loading) {
    return <DoctorPageShimmer compact />;
  }

  return (
    <div className="mx-auto max-w-2xl pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col items-center text-center"
      >
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-500 shadow-lg shadow-emerald-500/20">
          <FaCheckCircle className="text-3xl" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {hasEnded ? "Consultation ended" : "Post-consult actions"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {hasEnded ? "Session with" : "For your session with"}{" "}
          <span className="font-semibold text-slate-700">{patientName}</span>
        </p>
      </motion.div>

      <div className="flex flex-col gap-4">
        {/* Prescription card — shows summary if already saved, write prompt otherwise */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants}
          className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => router.push(`/doc/consultations/${params.id}/prescription`)}
            className="flex w-full items-center gap-4 p-5 transition-all hover:border-primary-200 hover:bg-slate-50 active:scale-[0.99]"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary shadow-sm">
              <FaPrescriptionBottleAlt className="text-lg" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h3 className="font-black tracking-tight text-slate-900">
                  {consultation?.prescription ? "Prescription" : "Write Prescription"}
                </h3>
                {consultation?.prescription && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <FaCheck className="text-[8px]" /> Saved
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {consultation?.prescription
                  ? `${consultation.prescription.medicines?.length ?? 0} medicine${(consultation.prescription.medicines?.length ?? 0) !== 1 ? "s" : ""} · ${consultation.prescription.diagnosis || "No diagnosis"}`
                  : "Add medicines, diagnosis, and instructions."}
              </p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
              {consultation?.prescription ? <FaEdit className="text-xs" /> : <FaArrowRight className="text-xs" />}
            </div>
          </button>

          {/* View prescription button when saved */}
          {consultation?.prescription && (
            <div className="border-t border-slate-100 px-5 py-3">
              <button
                onClick={() => router.push(`/doc/consultations/${params.id}/prescription/preview`)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-50 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-100"
              >
                <FaEye className="text-xs" /> View Full Prescription
              </button>
            </div>
          )}
        </motion.div>

        {/* Clinical Notes */}
        <motion.div
          custom={1} initial="hidden" animate="visible" variants={cardVariants}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <button onClick={() => setNotesOpen((o) => !o)} className="flex w-full items-center gap-4 text-left">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
              <FaStickyNote className="text-lg" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-black tracking-tight text-slate-900">Clinical Notes</h3>
                {notesSaved && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <FaCheck className="text-[8px]" /> Saved
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 truncate">
                {clinicalNotes ? clinicalNotes.slice(0, 55) + (clinicalNotes.length > 55 ? "…" : "") : "Record observations and diagnosis notes."}
              </p>
            </div>
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-transform ${notesOpen ? "rotate-90" : ""}`}>
              <FaArrowRight className="text-xs" />
            </div>
          </button>

          {notesOpen && (
            <div className="mt-4">
              <Divider className="mb-4" />
              <textarea
                rows={5}
                placeholder="e.g. Patient presented with fever for 2 days. Throat mildly inflamed. Prescribed antibiotics…"
                value={clinicalNotes}
                onChange={(e) => { setClinicalNotes(e.target.value); setNotesSaved(false); }}
                className="w-full resize-none rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  color="primary"
                  size="sm"
                  className="rounded-full px-5 font-semibold text-white"
                  onPress={handleSaveNotes}
                  isDisabled={!clinicalNotes.trim()}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Follow-up Date */}
        <motion.div
          custom={2} initial="hidden" animate="visible" variants={cardVariants}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <button onClick={() => setFollowUpOpen((o) => !o)} className="flex w-full items-center gap-4 text-left">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary shadow-sm">
              <FaCalendarPlus className="text-lg" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-black tracking-tight text-slate-900">Follow-up Date</h3>
                {followUpDate && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {new Date(followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">Schedule a follow-up appointment.</p>
            </div>
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-transform ${followUpOpen ? "rotate-90" : ""}`}>
              <FaArrowRight className="text-xs" />
            </div>
          </button>

          {followUpOpen && (
            <div className="mt-4">
              <Divider className="mb-4" />
              <input
                type="date"
                value={followUpDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => { setFollowUpDate(e.target.value); setFollowUpSaved(false); }}
                className="h-12 w-full rounded-2xl border-2 border-slate-200 px-4 text-sm font-semibold text-slate-700 focus:border-primary focus:outline-none"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  color="primary"
                  size="sm"
                  className="rounded-full px-5 font-semibold text-white"
                  onPress={handleSaveFollowUp}
                  isDisabled={!followUpDate}
                >
                  Save Follow-up
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Mark Complete */}
        <motion.div
          custom={3} initial="hidden" animate="visible" variants={cardVariants}
          className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-semibold text-emerald-700">
              All done? Mark this consultation as complete to close the session.
            </p>
            <Button
              className="h-12 rounded-full bg-emerald-600 px-8 font-semibold text-white shadow-lg shadow-emerald-500/25"
              size="lg"
              onPress={handleComplete}
            >
              Mark Consultation Complete
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
