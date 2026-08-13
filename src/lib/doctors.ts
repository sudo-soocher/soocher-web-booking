"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { Doctor } from "@/types/doctor";
import { db } from "./firebase-db";

const CACHE_KEY = "soocher_doctors_by_speciality_v1";
const TTL_MS = 5 * 60 * 1000;
const inflight = new Map<string, Promise<Doctor[]>>();

interface CachedEntry {
  at: number;
  doctors: Doctor[];
}

type DoctorCache = Record<string, CachedEntry>;

function readCache(speciality: string): Doctor[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as DoctorCache;
    const entry = cache[speciality];
    if (!entry || Date.now() - entry.at > TTL_MS) return null;
    return entry.doctors;
  } catch {
    return null;
  }
}

function writeCache(speciality: string, doctors: Doctor[]): void {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const cache = raw ? (JSON.parse(raw) as DoctorCache) : {};
    cache[speciality] = { at: Date.now(), doctors };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage may be unavailable; the in-memory de-duplication still applies.
  }
}

/** Returns a doctor already fetched by either listing page, without a read. */
export function getCachedDoctorById(doctorId: string): Doctor | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as DoctorCache;

    for (const entry of Object.values(cache)) {
      if (Date.now() - entry.at > TTL_MS) continue;
      const doctor = entry.doctors.find((item) => item.id === doctorId);
      if (doctor) return doctor;
    }
  } catch {
    // Treat corrupt or unavailable storage as a cache miss.
  }
  return null;
}

/**
 * Fetches the verified doctors for one speciality once per session cache window.
 * Both `/doctors` and `/[speciality]` use the same Firestore query, so sharing
 * the result prevents a duplicate billed read when users move between them.
 */
export function fetchDoctorsBySpeciality(speciality: string): Promise<Doctor[]> {
  const cached = readCache(speciality);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(speciality);
  if (pending) return pending;

  const request = getDocs(
    query(
      collection(db, "Users"),
      where("specialization", "==", speciality),
      where("isAccountVerified", "==", true)
    )
  )
    .then((snapshot) => {
      const doctors = snapshot.docs.map((doctorDoc) => ({
        id: doctorDoc.id,
        ...doctorDoc.data(),
      })) as Doctor[];
      writeCache(speciality, doctors);
      return doctors;
    })
    .finally(() => inflight.delete(speciality));

  inflight.set(speciality, request);
  return request;
}
