import type { FirestoreConsultation } from "@/doctor/services/consultations";

export interface ChatAvailability {
  isAvailable: boolean;
  startTime: number;
  endTime: number;
}

/**
 * Whether the chat for a given consultation is currently open.
 *
 * Window is: [consultationTime - BEFORE_MIN, consultationExpiration + AFTER_MIN].
 * Defaults match the patient booking app (soocher-web-booking/.env.local):
 *   - BEFORE_MIN = 0     → chat opens the moment a booking is made
 *   - AFTER_MIN  = 10080 → chat stays open for 7 days after the session ends
 *
 * Both knobs are overridable via env so the timing can be tuned per release.
 */
const DEFAULT_AFTER_MINUTES = 10080; // 7 days, mirrors the patient app
const DEFAULT_BEFORE_MINUTES = 0;

export function getChatAvailability(c: FirestoreConsultation): ChatAvailability {
  const now = Date.now();
  const beforeMinutes = parseInt(
    process.env.NEXT_PUBLIC_CHAT_AVAILABLE_BEFORE_MINUTES || String(DEFAULT_BEFORE_MINUTES),
    10
  );
  const afterMinutes = parseInt(
    process.env.NEXT_PUBLIC_CHAT_AVAILABLE_AFTER_MINUTES || String(DEFAULT_AFTER_MINUTES),
    10
  );

  const startTime =
    !Number.isFinite(beforeMinutes) || beforeMinutes === 0
      ? 0
      : c.consultationTime - beforeMinutes * 60 * 1000;

  const safeAfter = Number.isFinite(afterMinutes) ? afterMinutes : DEFAULT_AFTER_MINUTES;
  const endTime = c.consultationExpiration + safeAfter * 60 * 1000;

  return {
    isAvailable: now >= startTime && now <= endTime,
    startTime,
    endTime,
  };
}
