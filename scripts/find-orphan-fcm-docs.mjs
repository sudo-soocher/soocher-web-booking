#!/usr/bin/env node
/**
 * Find `Users` documents that consist of nothing but an `fcmToken` (and
 * timestamp-ish bookkeeping) — the exact corruption `saveFcmToken`'s old
 * `set(..., {merge:true})` could plant when it raced `claimDoctorAccount` and
 * created a placeholder document before the real account existed. See the
 * comment on `saveFcmToken` in src/lib/native-auth-uid.ts for the full story.
 *
 * Read-only by default:
 *   node scripts/find-orphan-fcm-docs.mjs
 *
 * Pass --delete to remove exactly the docs it lists (re-run without it first
 * to see what would be deleted):
 *   node scripts/find-orphan-fcm-docs.mjs --delete
 */
import { initializeApp, cert } from "firebase-admin/app";
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

const doDelete = process.argv.includes("--delete");

const sa = loadServiceAccount();
initializeApp({ credential: cert(sa), projectId: sa.projectId });
const db = getFirestore();

const snap = await db.collection("Users").get();
const orphans = [];

for (const d of snap.docs) {
  const data = d.data();
  const keys = Object.keys(data);
  // A real account — of either role, at any stage — always has `type` or
  // `phoneNumber` at minimum. A doc with neither, holding only fcmToken-ish
  // fields, can only be this corruption.
  const hasRealContent = "type" in data || "phoneNumber" in data;
  const looksLikeFcmOnly =
    "fcmToken" in data &&
    keys.every((k) => ["fcmToken", "updatedAt"].includes(k));
  if (!hasRealContent && looksLikeFcmOnly) {
    orphans.push({ id: d.id, keys });
  }
}

console.log(`Scanned ${snap.size} Users docs.`);
console.log(`Found ${orphans.length} fcmToken-only orphan(s):\n`);
for (const o of orphans) {
  console.log(`  ${o.id}  fields=[${o.keys.join(", ")}]`);
}

if (orphans.length === 0) {
  console.log("\nNothing to clean up.");
} else if (!doDelete) {
  console.log("\nRun again with --delete to remove exactly these documents.");
} else {
  console.log("\nDeleting...");
  for (const o of orphans) {
    await db.collection("Users").doc(o.id).delete();
    console.log(`  deleted ${o.id}`);
  }
  console.log("Done.");
}
