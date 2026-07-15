import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let [, k, v] = m;
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
        }
        if (!(k in process.env)) process.env[k] = v;
    }
}

const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing Firebase Admin creds in .env.local");
    process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const TARGET_PHONE = "9999977777";
const TARGET_NAME = "Emily George";
const NEW_TZ = "Asia/Dubai";

const mode = process.argv[2] === "--apply" ? "apply" : "dry";

async function findCandidates() {
    const users = db.collection("Users");
    const results = [];

    // The doctor record may store the phone with a country prefix (e.g. +919999977777),
    // so we look for both raw and prefixed variants.
    const variants = [
        TARGET_PHONE,
        `+91${TARGET_PHONE}`,
        `91${TARGET_PHONE}`,
        `+${TARGET_PHONE}`,
    ];

    for (const field of ["phoneNumber", "phone", "whatsappNumber"]) {
        for (const value of variants) {
            const snap = await users.where(field, "==", value).get();
            snap.forEach((d) => {
                results.push({
                    id: d.id,
                    matchedField: field,
                    matchedValue: value,
                    data: d.data(),
                });
            });
        }
    }

    // De-dupe by document id
    const byId = new Map();
    for (const r of results) if (!byId.has(r.id)) byId.set(r.id, r);
    return [...byId.values()];
}

const matches = await findCandidates();
console.log(`Found ${matches.length} candidate doc(s) matching phone ${TARGET_PHONE}:`);
for (const m of matches) {
    console.log(
        `  - id=${m.id}  name="${m.data.name}"  phoneNumber="${m.data.phoneNumber}"  currentTimezone="${m.data.timezone ?? ""}"  matchedField=${m.matchedField}  matchedValue=${m.matchedValue}`
    );
}

const emilyMatches = matches.filter(
    (m) => (m.data.name || "").trim().toLowerCase() === TARGET_NAME.toLowerCase()
);

if (emilyMatches.length === 0) {
    console.error(`No doc found for name "${TARGET_NAME}" with that phone.`);
    process.exit(1);
}
if (emilyMatches.length > 1) {
    console.error(`Ambiguous: multiple docs match "${TARGET_NAME}" — aborting.`);
    process.exit(1);
}

const target = emilyMatches[0];
console.log(
    `\nTarget: Users/${target.id} — name="${target.data.name}" — currentTimezone="${target.data.timezone ?? "(unset)"}" — newTimezone="${NEW_TZ}"`
);

if (mode === "dry") {
    console.log("\nDRY RUN — no write performed. Re-run with --apply to write.");
    process.exit(0);
}

await db.collection("Users").doc(target.id).update({ timezone: NEW_TZ });
console.log(`\nUPDATED Users/${target.id}.timezone = "${NEW_TZ}"`);

const after = await db.collection("Users").doc(target.id).get();
console.log(`Verified: timezone is now "${after.data().timezone}"`);
