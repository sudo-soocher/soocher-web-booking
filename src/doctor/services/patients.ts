"use client";

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/doctor/lib/firebase";
import type { FirestoreConsultation } from "@/doctor/services/consultations";

export interface DoctorPatient {
  /** Firebase UID — used as the unique identity even when the profile is missing. */
  uid: string;
  name: string;
  /** Optional fields hydrated from the Users/{uid} document. */
  photoUrl?: string;
  gender?: string;
  age?: number;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  /** Aggregated from this doctor's consultations only. */
  visitCount: number;
  lastVisitAt: number;
  /** True when the patient still has an upcoming consultation with the doctor. */
  hasUpcoming: boolean;
  /** True when we found a real Users/{uid} doc; false means we only have the booking snapshot. */
  hasProfile: boolean;
  /**
   * The patient's most recent consultation with this doctor — used as the
   * Stream chat channel context. Prefer an upcoming session over the latest
   * past one (so the chat is bound to the in-window booking).
   */
  latestConsultation: FirestoreConsultation;
}

const USERS_COLLECTION = "Users";

function parseAge(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function ageFromDob(dob: unknown): number | undefined {
  if (typeof dob !== "string" || !dob) return undefined;
  const t = Date.parse(dob);
  if (Number.isNaN(t)) return undefined;
  const diff = Date.now() - t;
  const years = diff / (365.25 * 24 * 60 * 60 * 1000);
  return years > 0 ? Math.floor(years) : undefined;
}

interface PatientUserDoc {
  uid?: string;
  name?: string;
  fullName?: string;
  profileImage?: string;
  profilePhotoUrl?: string;
  phoneNumber?: string;
  mobile?: string;
  email?: string;
  gender?: string;
  dob?: string;
  age?: number | string;
  currentCity?: string;
  city?: string;
  currentState?: string;
  state?: string;
  type?: string;
}

async function fetchPatientProfile(uid: string): Promise<PatientUserDoc | null> {
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snap.exists()) return null;
    return snap.data() as PatientUserDoc;
  } catch {
    return null;
  }
}

/**
 * Aggregate the doctor's consultations into a unique patient list.
 * One row per patient UID, with visit count + last visit date.
 * Profile fields (photo, contact, etc.) are best-effort: we hydrate from
 * Users/{uid} when we can, otherwise we fall back to the booking snapshot.
 */
export async function aggregatePatients(
  doctorUid: string,
  consultations: FirestoreConsultation[]
): Promise<DoctorPatient[]> {
  const byUid = new Map<
    string,
    {
      snapshot: FirestoreConsultation["extras"]["patientDetails"];
      visitCount: number;
      lastVisitAt: number;
      hasUpcoming: boolean;
      latest: FirestoreConsultation;
      /** Soonest upcoming consult, if any — preferred chat channel context. */
      nextUpcoming: FirestoreConsultation | null;
    }
  >();

  const now = Date.now();
  for (const c of consultations) {
    const patientUid = (c.participants || []).find((p) => p && p !== doctorUid);
    if (!patientUid) continue;
    const prev = byUid.get(patientUid);
    const upcoming = !c.cancelledByDoctor && !c.videoConsultDone && c.consultationTime > now;
    if (prev) {
      prev.visitCount += 1;
      if (c.consultationTime > prev.lastVisitAt) {
        prev.lastVisitAt = c.consultationTime;
        prev.latest = c;
      }
      if (upcoming) {
        prev.hasUpcoming = true;
        if (!prev.nextUpcoming || c.consultationTime < prev.nextUpcoming.consultationTime) {
          prev.nextUpcoming = c;
        }
      }
    } else {
      byUid.set(patientUid, {
        snapshot: c.extras?.patientDetails ?? {
          patientName: c.patientName,
          gender: "Other",
          patientAge: "",
          relationship: "",
        },
        visitCount: 1,
        lastVisitAt: c.consultationTime,
        hasUpcoming: upcoming,
        latest: c,
        nextUpcoming: upcoming ? c : null,
      });
    }
  }

  const uids = Array.from(byUid.keys());
  const profiles = await Promise.all(uids.map(fetchPatientProfile));

  return uids.map((uid, i) => {
    const agg = byUid.get(uid)!;
    const profile = profiles[i];
    const name =
      profile?.name ||
      profile?.fullName ||
      agg.snapshot.patientName ||
      "Unknown patient";
    const photo = profile?.profileImage || profile?.profilePhotoUrl;
    const phone = profile?.phoneNumber || profile?.mobile;
    const gender = profile?.gender || agg.snapshot.gender;
    const age =
      parseAge(profile?.age) ??
      ageFromDob(profile?.dob) ??
      parseAge(agg.snapshot.patientAge);

    return {
      uid,
      name,
      photoUrl: photo,
      gender: gender || undefined,
      age,
      phone: phone || undefined,
      email: profile?.email,
      city: profile?.currentCity || profile?.city,
      state: profile?.currentState || profile?.state,
      visitCount: agg.visitCount,
      lastVisitAt: agg.lastVisitAt,
      hasUpcoming: agg.hasUpcoming,
      hasProfile: profile !== null,
      // Prefer an upcoming consultation as the chat context — that keeps the
      // channel bound to the active booking rather than an old archived one.
      latestConsultation: agg.nextUpcoming ?? agg.latest,
    };
  });
}

/**
 * Convenience search: fetch the doctor's consultations + aggregate in one call.
 * Most callers will already have the consultations list (the appointments page
 * loads them too) — prefer aggregatePatients() with that data to avoid the
 * extra round-trip.
 */
export async function fetchDoctorPatients(doctorUid: string): Promise<DoctorPatient[]> {
  const q = query(
    collection(db, "Consultations"),
    where("participants", "array-contains", doctorUid)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map(
    (d) => ({ consultationId: d.id, ...d.data() } as FirestoreConsultation)
  );
  return aggregatePatients(doctorUid, list);
}
