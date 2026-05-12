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
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
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
