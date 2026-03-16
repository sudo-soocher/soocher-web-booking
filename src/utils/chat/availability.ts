import { Consultation } from "@/types/consultation";

export const getChatAvailability = (consultation: Consultation) => {
    const now = Date.now();
    const beforeMinutes = parseInt(process.env.NEXT_PUBLIC_CHAT_AVAILABLE_BEFORE_MINUTES || "0");
    const afterMinutes = parseInt(process.env.NEXT_PUBLIC_CHAT_AVAILABLE_AFTER_MINUTES || "60");

    // If beforeMinutes is 0, it means suddenly after booking (immediate)
    const startTime = (isNaN(beforeMinutes) || beforeMinutes === 0)
        ? 0
        : consultation.consultationTime - (beforeMinutes * 60 * 1000);

    const safeAfterMinutes = isNaN(afterMinutes) ? 60 : afterMinutes;
    const endTime = consultation.consultationExpiration + (safeAfterMinutes * 60 * 1000);

    const isAvailable = now >= startTime && now <= endTime;

    return {
        isAvailable,
        startTime,
        endTime,
    };
};
