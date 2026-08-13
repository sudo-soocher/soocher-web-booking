#!/usr/bin/env node
/**
 * Show why a phone number does or does not line up between Firestore and
 * Firebase Auth.
 *
 *   node scripts/diagnose-phone.mjs +918547980715
 *
 * Reads credentials exactly the way src/lib/firebase-admin.ts does:
 * service-account.json (or FIREBASE_ADMIN_KEY_PATH), else the
 * FIREBASE_ADMIN_* env vars.
 *
 * Read-only — it never writes.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function loadServiceAccount() {
  const jsonPath = path.resolve(
    process.cwd(),
    process.env.FIREBASE_ADMIN_KEY_PATH || "service-account.json"
  );
  if (fs.existsSync(jsonPath)) {
    const p = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    return {
      projectId: p.project_id,
      clientEmail: p.client_email,
      privateKey: p.private_key,
    };
  }
  return {
    projectId:
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
}

function normalizeE164(raw) {
  const cleaned = String(raw).replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+")) return null;
  return /^\d{8,15}$/.test(cleaned.slice(1)) ? cleaned : null;
}

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/diagnose-phone.mjs +918547980715");
  process.exit(1);
}
const e164 = normalizeE164(input);
if (!e164) {
  console.error(`Not a valid E.164 number: ${input}  (include the + and country code)`);
  process.exit(1);
}

const sa = loadServiceAccount();
initializeApp({ credential: cert(sa), projectId: sa.projectId });
const db = getFirestore();
const auth = getAuth();

console.log(`\nphone: ${e164}\n${"─".repeat(60)}`);

const snap = await db
  .collection("Users")
  .where("phoneNumber", "==", e164)
  .get();

console.log(`Firestore Users docs with this phoneNumber: ${snap.size}`);
for (const d of snap.docs) {
  const x = d.data();
  console.log(
    `   uid=${d.id}  type=${x.type ?? "(none)"}  name=${x.name ?? "(none)"}  onboardingComplete=${x.onboardingComplete ?? "(unset)"}`
  );
}

let authUid = null;
try {
  const u = await auth.getUserByPhoneNumber(e164);
  authUid = u.uid;
  console.log(
    `\nFirebase Auth user for this phone: uid=${u.uid}  providers=[${u.providerData.map((p) => p.providerId).join(", ") || "none"}]`
  );
} catch {
  console.log("\nFirebase Auth user for this phone: NONE");
}

console.log(`\n${"─".repeat(60)}\nverdict:`);
if (snap.size > 1) {
  console.log("  Multiple Users docs share this number — genuinely ambiguous.");
  console.log("  Decide which uid is canonical and clear phoneNumber from the others.");
} else if (snap.size === 1 && authUid && snap.docs[0].id !== authUid) {
  console.log("  MISMATCH — this is the bug.");
  console.log(`     Firestore doc uid : ${snap.docs[0].id}`);
  console.log(`     Auth phone uid    : ${authUid}`);
  console.log("  The Auth uid is most likely an orphan created by the old");
  console.log("  verify-otp, which called createUser() before its check.");
  console.log("  The fix signs in as the Firestore uid; the orphan can be deleted.");
} else if (snap.size === 1 && !authUid) {
  console.log("  Firestore owns the number, Auth has no phone user.");
  console.log("  Typical of a doctor who signed up with Google or email/password.");
  console.log("  The fix signs in as the Firestore uid and attaches the phone.");
} else if (snap.size === 1) {
  console.log("  Consistent — Firestore uid matches the Auth phone user.");
} else {
  console.log("  No Users doc owns this number; it would be a fresh sign-up.");
}
console.log("");
