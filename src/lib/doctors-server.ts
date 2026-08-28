import { getAdminFirestore } from "@/lib/firebase-admin";
import { withTimeout } from "@/lib/with-timeout";
import type { Doctor } from "@/types/doctor";

/**
 * Server-side counterpart to `fetchDoctorsBySpeciality` (client, in doctors.ts).
 * The doctors list page used to render nothing but a spinner until a client-
 * side Firestore query finished after hydration — reading it here, at request
 * time on the server, means the first card grid is already in the HTML the
 * browser receives.
 *
 * Returns `[]` on any failure — the page that calls this must treat that the
 * same as "no data yet" and fall back to the client-side fetch/retry it
 * already has.
 */
export async function fetchDoctorsBySpecialityServer(
  speciality: string
): Promise<Doctor[]> {
  try {
    const snap = await withTimeout(
      getAdminFirestore()
        .collection("Users")
        .where("specialization", "==", speciality)
        .where("isAccountVerified", "==", true)
        .get(),
      5000,
      "Doctors lookup timed out"
    );
    // Admin SDK document data can carry Firestore Timestamp instances
    // (lastTokenUpdate, accountCreationDate, phoneNumberFetchedAt, …) — real
    // class instances, not plain objects. React Server Components refuse to
    // pass those to a Client Component ("Only plain objects... can be
    // passed"), which crashed this entire page. The JSON round-trip strips
    // every such instance down to its plain serialized shape.
    return JSON.parse(
      JSON.stringify(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    ) as Doctor[];
  } catch (err) {
    console.error("[doctors-server] failed to fetch:", err);
    return [];
  }
}
