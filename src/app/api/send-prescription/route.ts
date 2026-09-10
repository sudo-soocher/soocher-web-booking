import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import {
    sendWhatsAppPrescription,
    type WhatsAppPrescriptionMedicine,
} from "@/services/whatsapp";

interface StoredMedicine {
    name?: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
}

interface StoredPrescription {
    diagnosis?: string;
    medicines?: StoredMedicine[];
    advice?: string | null;
    followUpDate?: string | null;
    savedAt?: number;
}

/** "2026-09-10" / epoch → "10 September 2026"; leaves an unrecognised string as-is. */
function formatDate(input?: string | number | null): string {
    if (input === undefined || input === null || input === "") return "";
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return typeof input === "string" ? input : "";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

export async function POST(request: NextRequest) {
    try {
        // ── Auth: the caller must be a signed-in participant of the consult ──
        const authHeader = request.headers.get("authorization") ?? "";
        const idToken = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : "";
        if (!idToken) {
            return NextResponse.json(
                { error: "Missing Authorization: Bearer <idToken> header" },
                { status: 401 },
            );
        }

        let callerUid: string;
        try {
            const decoded = await getAdminAuth().verifyIdToken(idToken);
            callerUid = decoded.uid;
        } catch {
            return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
        }

        const { consultationId } = (await request.json().catch(() => ({}))) as {
            consultationId?: string;
        };
        if (!consultationId) {
            return NextResponse.json(
                { error: "consultationId is required" },
                { status: 400 },
            );
        }

        const adminDb = getAdminFirestore();
        const snap = await adminDb.collection("Consultations").doc(consultationId).get();
        if (!snap.exists) {
            return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
        }
        const consultation = snap.data() as Record<string, unknown>;

        const participants = (consultation.participants as string[] | undefined) ?? [];
        if (!participants.includes(callerUid)) {
            return NextResponse.json(
                { error: "You are not a participant of this consultation" },
                { status: 403 },
            );
        }

        const prescription = consultation.prescription as StoredPrescription | undefined;
        if (
            !prescription ||
            (!prescription.diagnosis?.trim() && !(prescription.medicines?.length))
        ) {
            return NextResponse.json(
                { error: "This consultation has no saved prescription to send" },
                { status: 400 },
            );
        }

        // The patient is the participant who isn't the caller (the doctor).
        const patientUid = participants.find((p) => p !== callerUid);
        if (!patientUid) {
            return NextResponse.json(
                { error: "Could not resolve the patient for this consultation" },
                { status: 422 },
            );
        }

        // Phone: Users/{uid}.phoneNumber first, then the Firebase Auth record.
        let patientPhone = "";
        const userSnap = await adminDb.collection("Users").doc(patientUid).get();
        patientPhone =
            (userSnap.exists
                ? (userSnap.data()?.phoneNumber as string | undefined)
                : "") ?? "";
        if (!patientPhone) {
            try {
                const authUser = await getAdminAuth().getUser(patientUid);
                patientPhone = authUser.phoneNumber ?? "";
            } catch {
                /* no auth record / no phone — handled below */
            }
        }
        if (!patientPhone) {
            return NextResponse.json(
                { error: "The patient has no WhatsApp number on file" },
                { status: 422 },
            );
        }

        const extras = consultation.extras as
            | { patientDetails?: { patientName?: string } }
            | undefined;
        const patientName =
            extras?.patientDetails?.patientName?.trim() ||
            (consultation.patientName as string | undefined)?.trim() ||
            "Patient";
        const doctorName =
            (consultation.doctorName as string | undefined)?.trim() || "Your Doctor";

        const linkBase = (
            process.env.PRESCRIPTION_LINK_BASE_URL ||
            request.nextUrl.origin ||
            "https://soocher.in"
        ).replace(/\/+$/, "");
        const prescriptionUrl = `${linkBase}/prescriptions/${consultationId}`;

        const medicines: WhatsAppPrescriptionMedicine[] = (
            prescription.medicines ?? []
        )
            .filter((m) => (m.name ?? "").trim())
            .map((m) => ({
                name: (m.name ?? "").trim(),
                dose: m.dose,
                frequency: m.frequency,
                duration: m.duration,
                instructions: m.instructions,
            }));

        const result = await sendWhatsAppPrescription({
            recipient_mobile_number: patientPhone,
            patientName,
            doctorName,
            date: formatDate(prescription.savedAt ?? Date.now()),
            diagnosis: (prescription.diagnosis ?? "").trim() || "-",
            medicines,
            advice: prescription.advice ?? null,
            followUp: prescription.followUpDate
                ? formatDate(prescription.followUpDate)
                : null,
            prescriptionUrl,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error ?? "WhatsApp provider rejected the message" },
                { status: 502 },
            );
        }

        return NextResponse.json({ success: true, sentTo: patientPhone });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(">>> [SEND-PRESCRIPTION ERROR]", message);
        return NextResponse.json(
            { error: "Failed to send prescription", details: message },
            { status: 500 },
        );
    }
}
