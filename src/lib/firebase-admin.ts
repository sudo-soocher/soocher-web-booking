import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let adminApp: App | null = null;

function loadServiceAccount(): { projectId: string; clientEmail: string; privateKey: string } {
    const jsonPath = process.env.FIREBASE_ADMIN_KEY_PATH
        ? path.resolve(process.cwd(), process.env.FIREBASE_ADMIN_KEY_PATH)
        : path.resolve(process.cwd(), "service-account.json");

    if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
            throw new Error(`Service account file at ${jsonPath} is missing required fields.`);
        }
        return {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
        };
    }

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            `Firebase Admin credentials missing. Place service-account.json at project root, or set FIREBASE_ADMIN_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY env vars.`
        );
    }
    return { projectId, clientEmail, privateKey };
}

function getAdminApp(): App {
    if (adminApp) return adminApp;

    const existing = getApps();
    if (existing.length > 0) {
        adminApp = existing[0];
        return adminApp;
    }

    const { projectId, clientEmail, privateKey } = loadServiceAccount();
    adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
    });
    return adminApp;
}

export function getAdminAuth(): Auth {
    return getAuth(getAdminApp());
}

export function getAdminFirestore(): Firestore {
    return getFirestore(getAdminApp());
}
