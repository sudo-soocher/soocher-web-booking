"use client";

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase-db";

export interface Speciality {
  name: string;
  description: string;
}

/**
 * `Specialities/available` is a single document that changes rarely, but it was
 * being fetched independently by the home page and the doctors list — so every
 * navigation between them paid for the same read again.
 *
 * Two layers of caching:
 *  - an in-flight promise, so concurrent callers in one session share one read
 *  - sessionStorage, so a full page reload (which is what a WebView relaunch is)
 *    paints from cache immediately and revalidates in the background
 */

const CACHE_KEY = "soocher_specialities_v1";
const TTL_MS = 30 * 60 * 1000;

let inflight: Promise<Speciality[]> | null = null;

interface Cached {
  at: number;
  data: Speciality[];
}

function readCache(): Speciality[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!Array.isArray(parsed?.data)) return null;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: Speciality[]): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), data } satisfies Cached)
    );
  } catch {
    // sessionStorage may be full or blocked — the network path still works
  }
}

/** Cached value if one is available right now, without touching the network. */
export function getCachedSpecialities(): Speciality[] | null {
  return typeof window === "undefined" ? null : readCache();
}

export function fetchSpecialities(): Promise<Speciality[]> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = getDoc(doc(db, "Specialities", "available"))
    .then((snap) => {
      const data = snap.exists()
        ? ((snap.data().specialityName as Speciality[]) ?? [])
        : [];
      writeCache(data);
      return data;
    })
    .finally(() => {
      // Keep only active requests in memory. Once the TTL expires, a later
      // caller can perform a fresh read instead of receiving an old promise.
      inflight = null;
    });

  return inflight;
}
