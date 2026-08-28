import { getAdminFirestore } from "@/lib/firebase-admin";
import { withTimeout } from "@/lib/with-timeout";
import type { Speciality } from "@/lib/specialities";

/**
 * Server-side counterpart to `fetchSpecialities` (client). The home page used
 * to render an empty speciality grid on first paint and only fetch this list
 * from the browser after hydration — every image request was blocked behind
 * that client-side Firestore round trip, even though the images themselves
 * were already small. Reading it here, at request time on the server, means
 * the grid (and its <img> tags) is already in the HTML the browser receives,
 * so image downloads start immediately instead of waiting on JS + a network
 * round trip.
 *
 * Returns `[]` on any failure (missing doc, timeout, credentials) — the page
 * that calls this must treat that the same as "no data yet" and fall back to
 * the client-side fetch/retry it already has.
 */
export async function fetchSpecialitiesServer(): Promise<Speciality[]> {
  try {
    const snap = await withTimeout(
      getAdminFirestore().collection("Specialities").doc("available").get(),
      5000,
      "Specialities lookup timed out"
    );
    if (!snap.exists) return [];
    const data = snap.data();
    return (data?.specialityName as Speciality[] | undefined) ?? [];
  } catch (err) {
    console.error("[specialities-server] failed to fetch:", err);
    return [];
  }
}
