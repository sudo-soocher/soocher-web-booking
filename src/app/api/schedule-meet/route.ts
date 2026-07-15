import { NextResponse } from "next/server";
import { formatDateStr, formatTimeStr } from "@/utils/timezone";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            consultationId,
            consultationTime,
            doctorName,
            patientName,
            patientEmail,
            patientPhone,
            doctorPhone,
            specialization,
            timezone,
            doctorTimezone
        } = body;

        // Check for strictly required fields for the scheduler
        const missing = [];
        if (!consultationId) missing.push("consultationId");
        if (!consultationTime) missing.push("consultationTime");
        if (!doctorName) missing.push("doctorName");
        if (!patientName) missing.push("patientName");
        if (!patientEmail) missing.push("patientEmail");

        if (missing.length > 0) {
            console.error(">>> [TRIGGER ERROR] Missing fields:", missing);
            return NextResponse.json(
                { error: "Missing required fields", missing },
                { status: 400 }
            );
        }

        // Patient's timezone (falls back to Asia/Kolkata)
        const patientTimezone = timezone || "Asia/Kolkata";
        // Doctor's timezone (falls back to Asia/Kolkata when the doctor doc has none)
        const doctorTz = doctorTimezone || "Asia/Kolkata";

        // Format date and time for the scheduler API using the patient's timezone
        // (unchanged behavior for calendar/meet).
        const d = new Date(consultationTime);
        const dateStr = formatDateStr(consultationTime, patientTimezone);
        const timeStr = formatTimeStr(consultationTime, patientTimezone);

        // Separate strings for WhatsApp — each recipient sees the time in their
        // own timezone. If patient and doctor share a timezone these collapse
        // back to the same values.
        const patientDateStr = dateStr;
        const patientTimeStr = timeStr;
        const doctorDateStr = formatDateStr(consultationTime, doctorTz);
        const doctorTimeStr = formatTimeStr(consultationTime, doctorTz);

        // Get URL from MEET_SCHEDULER_API as requested
        const schedulerUrl = process.env.MEET_SCHEDULER_API || "http://localhost:8001/schedule-meet";
        const apiKey = process.env.MEET_SCHEDULER_API_KEY;

        const payload = {
            date: dateStr,
            time: timeStr,
            user_mail: patientEmail.trim(),
            user_name: patientName.trim(),
            doctors_name: doctorName.trim(),
            department_name: specialization?.trim() || "General Health",
            timezone: patientTimezone
        };

        console.log(">>> [TRIGGER] Scheduled Meet API Call triggered");
        console.log(">>> [TRIGGER] Target URL:", schedulerUrl);
        console.log(">>> [TRIGGER] Payload:", JSON.stringify(payload, null, 2));

        const response = await fetch(schedulerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": apiKey || "",
            },
            body: JSON.stringify(payload),
        });

        console.log(">>> [TRIGGER] Response Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(">>> [TRIGGER ERROR] Body:", errorText);
            throw new Error(`Scheduler API failed (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        console.log(">>> [TRIGGER DATA] Response:", JSON.stringify(result, null, 2));

        if (!result.status || !result.data?.meet_link) {
            throw new Error(result.message || "Failed to get Meet link from scheduler");
        }

        const meetLink = result.data.meet_link;

        // Trigger WhatsApp Notification (Async - don't block response)
        if (patientPhone) {
            console.log(
                ">>> [TRIGGER] Triggering WhatsApp notification for patient:",
                patientPhone,
                `(tz=${patientTimezone})`
            );
            // We use dynamic import to avoid potential circular dependency or issues in Edge runtime if applicable
            import("@/services/whatsapp").then(({ sendWhatsAppBookingConfirmation }) => {
                sendWhatsAppBookingConfirmation({
                    recipient_mobile_number: patientPhone,
                    patientName: patientName.trim(),
                    doctorName: doctorName.trim(),
                    date: patientDateStr,
                    time: patientTimeStr,
                    meetLink: meetLink
                }).catch(waError => {
                    console.error(">>> [TRIGGER ERROR] WhatsApp patient notification failed:", waError);
                });
            });
        }

        if (doctorPhone) {
            console.log(
                ">>> [TRIGGER] Triggering WhatsApp notification for doctor:",
                doctorPhone,
                `(tz=${doctorTz})`
            );
            import("@/services/whatsapp").then(({ sendWhatsAppDoctorBookingConfirmation }) => {
                sendWhatsAppDoctorBookingConfirmation({
                    recipient_mobile_number: doctorPhone,
                    patientName: patientName.trim(),
                    doctorName: doctorName.trim(),
                    date: doctorDateStr,
                    time: doctorTimeStr,
                    meetLink: meetLink
                }).catch(waError => {
                    console.error(">>> [TRIGGER ERROR] WhatsApp doctor notification failed:", waError);
                });
            });
        } else {
            console.warn(">>> [TRIGGER] Skipping doctor WhatsApp — doctorPhone is empty/missing in payload");
        }

        return NextResponse.json({
            meetLink: meetLink,
            message: result.message
        });
    } catch (err: unknown) {
        const error = err as { message?: string };
        console.error("Error creating Meet link via scheduler:", error?.message || error);
        return NextResponse.json(
            { error: "Failed to create Meet link", details: error?.message },
            { status: 500 }
        );
    }
}

