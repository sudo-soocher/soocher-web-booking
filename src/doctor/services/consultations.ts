"use client";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/doctor/lib/firebase";

// Raw Firestore shape from the booking app
export interface FirestoreConsultation {
  consultationId: string;
  patientName: string;
  doctorName: string;
  consultationTime: number;        // epoch ms — scheduled start
  consultationExpiration: number;  // epoch ms — end of session window
  chatExpiration: number;
  actualStartTime: number | null;
  actualEndTime: number | null;
  videoConsultDone: boolean;
  patientInRoom: boolean;
  doctorInRoom: boolean;
  cancelledByDoctor: boolean;
  patientUnread: number;
  doctorUnread: number;
  notesForDoctor: string;
  participants: string[];
  attachments: string[];
  extras: {
    meetingId: string;
    meetLink?: string;
    streamCallId?: string;
    patientDetails: {
      patientName: string;
      gender: "Male" | "Female" | "Other";
      patientAge: string;
      relationship: string;
    };
  };
  badExperienceDoctor: string | null;
  badExperiencePatient: string | null;
  reasonForCancellation: string | null;
  jobName: string;
  booking_type?: string;
  timezone?: string;
  appliedCoupon?: string | null;
  couponDiscount?: number;
  // Post-consultation fields saved by the doctor
  clinicalNotes?: string;
  followUpDate?: string;
  prescription?: {
    diagnosis: string;
    medicines: import("@/doctor/types/consultation").Medicine[];
    advice?: string;
    followUpDate?: string;
    savedAt: number;
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function epochToTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function epochToDateStr(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function deriveStatus(c: FirestoreConsultation): "scheduled" | "completed" | "cancelled" {
  if (c.cancelledByDoctor) return "cancelled";
  if (c.videoConsultDone) return "completed";
  return "scheduled";
}

/** Fetch all consultations for a given doctor UID from Firestore. */
export async function fetchDoctorConsultations(doctorUid: string): Promise<FirestoreConsultation[]> {
  const q = query(
    collection(db, "Consultations"),
    where("participants", "array-contains", doctorUid),
    orderBy("consultationTime", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ consultationId: d.id, ...d.data() } as FirestoreConsultation));
}

/** Fetch a single consultation by its ID. */
export async function fetchConsultationById(id: string): Promise<FirestoreConsultation | null> {
  const snap = await getDoc(doc(db, "Consultations", id));
  if (!snap.exists()) return null;
  return { consultationId: snap.id, ...snap.data() } as FirestoreConsultation;
}

/** Bucket raw consultations into today / upcoming / past relative to now. */
export function bucketConsultations(list: FirestoreConsultation[]) {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const today: FirestoreConsultation[] = [];
  const upcoming: FirestoreConsultation[] = [];
  const past: FirestoreConsultation[] = [];

  for (const c of list) {
    const t = c.consultationTime;
    if (t >= todayStart.getTime() && t <= todayEnd.getTime()) {
      today.push(c);
    } else if (t > todayEnd.getTime()) {
      upcoming.push(c);
    } else {
      past.push(c);
    }
  }

  // Today: show earliest first; upcoming: earliest first; past: most recent first
  today.sort((a, b) => a.consultationTime - b.consultationTime);
  upcoming.sort((a, b) => a.consultationTime - b.consultationTime);
  // past already desc from query

  return { today, upcoming, past };
}

/** Helpers exposed for display */
export { epochToTime, epochToDateStr, deriveStatus };
