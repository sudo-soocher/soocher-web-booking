/**
 * The doctor app's Firebase entry point, now backed by the patient app's single
 * set of instances.
 *
 * Standalone, this module called `initializeApp` and `initializeFirestore`
 * itself. Merged into one Next app that is a hard error — both modules load in
 * the same process and the second call throws:
 *
 *   initializeFirestore() has already been called with different options
 *
 * Both apps talk to the same Firebase project (`soocherv2`), so there is exactly
 * one app, one Firestore, one Auth and one Storage. This file stays as a
 * re-export so the ~50 doctor modules importing `@/doctor/lib/firebase` need no
 * changes.
 *
 * The persistent IndexedDB cache the doctor app relied on is unchanged — it now
 * lives in `@/lib/firebase-db`, configured identically
 * (`persistentLocalCache` + `persistentMultipleTabManager`).
 */

export { firebaseApp as default } from "@/lib/firebase-app";
export { auth } from "@/lib/firebase-auth";
export { db } from "@/lib/firebase-db";
export { storage } from "@/lib/firebase-storage";
export { appCheckReady } from "@/lib/firebase-appcheck";
