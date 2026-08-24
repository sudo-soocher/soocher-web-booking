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

function fetchFresh(speciality: string): Promise<Doctor[]> {
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

/**
 * Fetches the verified doctors for one speciality, serving the session cache
 * when available. Both `/doctors` and `/[speciality]` use the same Firestore
 * query, so sharing the result prevents a duplicate billed read when users
 * move between them.
 *
 * `onRevalidate` — pass this so a cached (possibly stale) result is still
 * shown instantly, but a live read runs in the background regardless and
 * calls back with fresh data if anything differs. Without it, a doctor
 * editing their profile (e.g. a fee change) wouldn't reach another user's
 * already-open listing page until the cache's TTL naturally expired — up to
 * 5 minutes. The doctor detail page already does this same pattern; this
 * brings the listing pages in line with it.
 */
export function fetchDoctorsBySpeciality(
  speciality: string,
  onRevalidate?: (doctors: Doctor[]) => void
): Promise<Doctor[]> {
  const cached = readCache(speciality);
  if (cached) {
    if (onRevalidate) {
      fetchFresh(speciality)
        .then(onRevalidate)
        .catch(() => {
          // A failed background revalidation just means the cached list
          // keeps showing — no worse than before this existed.
        });
    }
    return Promise.resolve(cached);
  }

  return fetchFresh(speciality);
}
