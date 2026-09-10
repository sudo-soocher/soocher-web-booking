/**
 * WhatsApp Notification Service via ChatMitra
 */

const CHATMITRA_API_URL = process.env.WHATSAPP_API_URL || "https://backend.chatmitra.com/developer/api/send_message";

function normalizePhone(input: string): string {
    let p = input.replace(/[+\s\-()]/g, "");
    if (p.length === 10) p = `91${p}`;
    return p;
}

async function postToChatMitra(body: Record<string, unknown>) {
    const apiKey = process.env.WHATSAPP_API_KEY;
    if (!apiKey) throw new Error("WHATSAPP_API_KEY missing");

    const response = await fetch(CHATMITRA_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(`ChatMitra API failed (${response.status}): ${JSON.stringify(result)}`);
    }
    if (result?.status === false || result?.success === false || result?.error) {
        throw new Error(result?.message || result?.error || "ChatMitra rejected the message");
    }
    return result;
}

export const sendWhatsAppOtp = async (recipientMobileNumber: string, otpCode: string) => {
    const cleanPhone = normalizePhone(recipientMobileNumber);
    if (!cleanPhone) return { success: false, error: "Recipient mobile number is empty" };

    const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || "otp_verification_20260512021206";
    const language = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en_US";

    const body = {
        recipient_mobile_number: cleanPhone,
        messages: [
            {
                kind: "template",
                template: {
                    name: templateName,
                    language,
                    components: [
                        {
                            type: "body",
                            parameters: [{ type: "text", text: otpCode }],
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: "0",
                            parameters: [{ type: "text", text: otpCode }],
                        },
                    ],
                },
            },
        ],
        customer_name: "Soocher User",
    };

    try {
        console.log(">>> [WHATSAPP OTP] Sending to:", cleanPhone);
        const result = await postToChatMitra(body);
        return { success: true, data: result };
    } catch (error) {
        console.error(">>> [WHATSAPP OTP ERROR]", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
};

interface WhatsAppParams {
    recipient_mobile_number: string;
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    meetLink: string;
}

export const sendWhatsAppBookingConfirmation = async (params: WhatsAppParams) => {
    const {
        recipient_mobile_number,
        patientName,
        doctorName,
        date,
        time,
        meetLink
    } = params;

    // Clean phone number: remove '+', spaces, and dashes
    let cleanPhone = recipient_mobile_number.replace(/[+\s\-()]/g, "");

    if (!cleanPhone) {
        console.error(">>> [WHATSAPP ERROR] Recipient mobile number is empty");
        return { success: false, error: "Recipient mobile number is empty" };
    }

    // Ensure India country code (91) when a bare 10-digit number is supplied
    if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
    }

    const apiKey = process.env.WHATSAPP_API_KEY;
    const templateName = process.env.WA_USER_BOOKING_CONF_TEMP;
    const apiUrl = process.env.WHATSAPP_API_URL || "https://backend.chatmitra.com/developer/api/send_message";

    if (!apiKey || !templateName) {
        console.error(">>> [WHATSAPP ERROR] Missing API Key or Template Name");
        return { success: false, error: "Configuration missing" };
    }

    const body = {
        recipient_mobile_number: cleanPhone,
        messages: [
            {
                kind: "template",
                template: {
                    name: templateName,
                    language: "en_US",
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: patientName },
                                { type: "text", text: doctorName },
                                { type: "text", text: date },
                                { type: "text", text: time },
                                { type: "text", text: meetLink }
                            ]
                        }
                    ]
                }
            }
        ],
        customer_name: patientName
    };

    try {
        console.log(">>> [WHATSAPP] Sending notification to:", cleanPhone);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
        });

        const result = await response.json();
        console.log(">>> [WHATSAPP] Response:", JSON.stringify(result, null, 2));

        if (!response.ok) {
            throw new Error(`ChatMitra API failed (${response.status}): ${JSON.stringify(result)}`);
        }

        // ChatMitra returns 200 even when the message is rejected downstream.
        // Surface that as a failure so callers can see why a real number isn't delivered.
        if (result?.status === false || result?.success === false || result?.error) {
            console.error(">>> [WHATSAPP ERROR] API returned failure payload:", result);
            return { success: false, error: result?.message || result?.error || "ChatMitra rejected the message", data: result };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error(">>> [WHATSAPP ERROR]", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Prescription (Rx) delivery to the patient's WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

export interface WhatsAppPrescriptionMedicine {
    name: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
}

export interface WhatsAppPrescriptionParams {
    recipient_mobile_number: string;
    patientName: string;
    doctorName: string;
    date: string;                 // already formatted, e.g. "10 September 2026"
    diagnosis: string;
    medicines: WhatsAppPrescriptionMedicine[];
    advice?: string | null;
    followUp?: string | null;     // already formatted, or null
    prescriptionUrl: string;      // link to the full prescription page
}

/**
 * WhatsApp rejects a template body parameter that contains a tab character or
 * more than four consecutive spaces, and a parameter may not be only
 * whitespace. Newlines ARE allowed (Meta relaxed this in 2023) — kept only for
 * the medicines list, collapsed to ", " everywhere else so each field stays on
 * one line.
 */
const cleanParam = (
    value: string,
    opts: { allowNewlines?: boolean } = {},
): string => {
    let out = (value ?? "").replace(/\t/g, " ").replace(/ {2,}/g, " ");
    out = opts.allowNewlines
        ? out.replace(/\n{3,}/g, "\n\n")
        : out.replace(/\s*\n\s*/g, ", ");
    return out.trim();
};

const formatMedicinesForWhatsApp = (
    meds: WhatsAppPrescriptionMedicine[],
): string => {
    if (!meds?.length) return "As advised by the doctor";
    return meds
        .map((m, i) => {
            const detail = [m.dose, m.frequency, m.duration]
                .map((s) => (s ?? "").trim())
                .filter(Boolean)
                .join(", ");
            const note = (m.instructions ?? "").trim();
            return `${i + 1}. ${(m.name ?? "Medicine").trim()}${detail ? ` - ${detail}` : ""}${note ? ` (${note})` : ""}`;
        })
        .join("\n");
};

/**
 * Sends the saved prescription to the patient over WhatsApp using the
 * `WA_PRESCRIPTION_TEMP` ChatMitra template. The template body must declare
 * exactly 8 variables, in this order:
 *   {{1}} patient name   {{2}} doctor name   {{3}} date          {{4}} diagnosis
 *   {{5}} medicines list  {{6}} advice        {{7}} follow-up date {{8}} link
 */
export const sendWhatsAppPrescription = async (
    params: WhatsAppPrescriptionParams,
) => {
    const cleanPhone = normalizePhone(params.recipient_mobile_number);
    if (!cleanPhone) {
        console.error(">>> [WHATSAPP RX ERROR] Recipient mobile number is empty");
        return { success: false, error: "Recipient mobile number is empty" };
    }

    const templateName = process.env.WA_PRESCRIPTION_TEMP;
    if (!templateName) {
        console.error(">>> [WHATSAPP RX ERROR] WA_PRESCRIPTION_TEMP missing");
        return { success: false, error: "Configuration missing" };
    }
    const language = process.env.WA_PRESCRIPTION_TEMP_LANG || "en_US";

    const body = {
        recipient_mobile_number: cleanPhone,
        messages: [
            {
                kind: "template",
                template: {
                    name: templateName,
                    language,
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: cleanParam(params.patientName) || "Patient" },
                                { type: "text", text: cleanParam(params.doctorName) || "your doctor" },
                                { type: "text", text: cleanParam(params.date) || "-" },
                                { type: "text", text: cleanParam(params.diagnosis) || "-" },
                                {
                                    type: "text",
                                    text:
                                        cleanParam(formatMedicinesForWhatsApp(params.medicines), {
                                            allowNewlines: true,
                                        }) || "As advised by the doctor",
                                },
                                { type: "text", text: cleanParam(params.advice || "") || "No additional advice" },
                                { type: "text", text: cleanParam(params.followUp || "") || "Not scheduled" },
                                { type: "text", text: params.prescriptionUrl },
                            ],
                        },
                    ],
                },
            },
        ],
        customer_name: params.patientName,
    };

    try {
        console.log(">>> [WHATSAPP RX] Sending prescription to:", cleanPhone);
        const result = await postToChatMitra(body);
        return { success: true, data: result };
    } catch (error) {
        console.error(">>> [WHATSAPP RX ERROR]", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
};

export const sendWhatsAppDoctorBookingConfirmation = async (params: WhatsAppParams) => {
    const {
        recipient_mobile_number,
        patientName,
        doctorName,
        date,
        time,
        meetLink
    } = params;

    const cleanPhone = normalizePhone(recipient_mobile_number);
    if (!cleanPhone) {
        console.error(">>> [WHATSAPP DR ERROR] Recipient mobile number is empty");
        return { success: false, error: "Recipient mobile number is empty" };
    }

    const templateName = process.env.WA_DR_BOOKING_CONF_TEMP;
    if (!templateName) {
        console.error(">>> [WHATSAPP DR ERROR] WA_DR_BOOKING_CONF_TEMP missing");
        return { success: false, error: "Configuration missing" };
    }

    const body = {
        recipient_mobile_number: cleanPhone,
        messages: [
            {
                kind: "template",
                template: {
                    name: templateName,
                    language: "en_US",
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: doctorName },
                                { type: "text", text: patientName },
                                { type: "text", text: date },
                                { type: "text", text: time },
                                { type: "text", text: meetLink }
                            ]
                        }
                    ]
                }
            }
        ],
        customer_name: doctorName
    };

    try {
        console.log(">>> [WHATSAPP DR] Sending notification to:", cleanPhone);
        const result = await postToChatMitra(body);
        return { success: true, data: result };
    } catch (error) {
        console.error(">>> [WHATSAPP DR ERROR]", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
};
