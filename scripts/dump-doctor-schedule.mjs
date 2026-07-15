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
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (!(k in process.env)) process.env[k] = v;
    }
}

initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
});
const db = getFirestore();

const DOC_ID = "iBp2q3MIqeaaDmRY3w7pK5SWvG12";

const userSnap = await db.collection("Users").doc(DOC_ID).get();
const user = userSnap.data();
console.log("=== Users/" + DOC_ID + " (summary) ===");
console.log("name         :", user.name);
console.log("phoneNumber  :", user.phoneNumber);
console.log("timezone     :", user.timezone);
console.log("slotDuration :", user.slotDuration);
console.log("timeSlots    :", JSON.stringify(user.timeSlots, null, 2));

console.log("\n=== Users/" + DOC_ID + "/Available Slots ===");
const daysSnap = await db.collection("Users").doc(DOC_ID).collection("Available Slots").get();
if (daysSnap.empty) {
    console.log("(no docs — slots are generated dynamically from timeSlots)");
} else {
    daysSnap.forEach((d) => {
        const data = d.data();
        console.log(`\nDay: ${d.id}`);
        console.log("  isActive       :", data.isActive);
        const arr = data.availableSlots || [];
        console.log(`  availableSlots : ${arr.length} entries`);
        arr.slice(0, 3).forEach((s, i) => {
            console.log(`    [${i}] time="${s.time}" bookingDate=${s.bookingDate} (${new Date(s.bookingDate).toISOString()}) isBooked=${s.isBooked}`);
        });
        if (arr.length > 6) console.log("    ...");
        arr.slice(-3).forEach((s, i) => {
            const idx = arr.length - 3 + i;
            console.log(`    [${idx}] time="${s.time}" bookingDate=${s.bookingDate} (${new Date(s.bookingDate).toISOString()}) isBooked=${s.isBooked}`);
        });
    });
}
