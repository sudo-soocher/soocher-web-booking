// Types for the extras field
export interface PatientDetails {
  patientName: string;
  gender: "Male" | "Female" | "Other";
  patientAge: string;
  relationship: "self" | "parent" | "spouse" | "child" | "other";
}

interface ConsultationExtras {
  meetingId: string;
  meetLink?: string; // Google Meet link (generated after booking)
  streamCallId?: string; // Stream.io video call ID (generated after booking)
  patientDetails: PatientDetails;
}

export interface Consultation {
  // Basic Information
  consultationId: string;
  patientName: string;
  doctorName: string;

  // Timing Information
  consultationTime: number; // Scheduled start time (epoch)
  consultationExpiration: number; // Consultation expiry time (epoch)
  chatExpiration: number; // Chat expiry time (epoch)
  actualStartTime: number | null; // Actual start time (epoch)
  actualEndTime: number | null; // Actual end time (epoch)

  // Status Indicators
  videoConsultDone: boolean;
  patientInRoom: boolean;
  doctorInRoom: boolean;
  cancelledByDoctor: boolean;

  // Communication
  patientUnread: number;
  doctorUnread: number;
  notesForDoctor: string;

  // Participants and Attachments
  participants: string[]; // Array of user UIDs
  attachments: string[]; // Array of attachment URLs/references

  // Additional Details
  extras: ConsultationExtras;

  // Feedback and Cancellation
  badExperienceDoctor: string | null;
  badExperiencePatient: string | null;
  reasonForCancellation: string | null;

  // Job Information (for scheduling)
  jobName: string;

  // Booking source
  booking_type: string;

  // User Timezone
  timezone: string;

  // Coupon Information
  appliedCoupon?: string | null;
  couponDiscount?: number;

  // WhatsApp Numbers
  patientWhatsApp?: string;
  doctorWhatsApp?: string;
  wa_noti_15min: boolean;
}

// Helper function to check if consultation is active
export const isConsultationActive = (consultation: Consultation): boolean => {
  const now = Date.now();
  return (
    now >= consultation.consultationTime &&
    now <= consultation.consultationExpiration
  );
};

// Helper function to check if chat is still available
export const isChatAvailable = (consultation: Consultation): boolean => {
  return Date.now() <= consultation.chatExpiration;
};

// Helper function to get consultation status
export const getConsultationStatus = (
  consultation: Consultation
): "upcoming" | "active" | "completed" | "cancelled" | "expired" => {
  const now = Date.now();

  if (consultation.cancelledByDoctor) {
    return "cancelled";
  }

  if (consultation.videoConsultDone) {
    return "completed";
  }

  if (now < consultation.consultationTime) {
    return "upcoming";
  }

  if (now <= consultation.consultationExpiration) {
    return "active";
  }

  return "expired";
};

// Helper function to get consultation duration in minutes
export const getConsultationDuration = (
  consultation: Consultation
): number | null => {
  if (!consultation.actualStartTime || !consultation.actualEndTime) {
    return null;
  }

  return Math.round(
    (consultation.actualEndTime - consultation.actualStartTime) / 60000
  );
};

// Function to create a new consultation
export const createNewConsultation = (
  consultationId: string,
  patientName: string,
  doctorName: string,
  consultationTime: number,
  participants: string[],
  meetingId: string,
  patientDetails: PatientDetails,
  consultationExpiration: number,
  timezone: string = "Asia/Kolkata",
  appliedCoupon: string | null = null,
  couponDiscount: number = 0,
  patientWhatsApp?: string,
  doctorWhatsApp?: string
): Consultation => {
  return {
    consultationId,
    patientName,
    doctorName,
    consultationTime,
    // Set expiration times (15 min consultation + 24 hours for chat)
    consultationExpiration: consultationExpiration,
    chatExpiration: consultationTime + 24 * 60 * 60 * 1000,
    actualStartTime: null,
    actualEndTime: null,
    videoConsultDone: false,
    patientInRoom: false,
    doctorInRoom: false,
    cancelledByDoctor: false,
    patientUnread: 0,
    doctorUnread: 0,
    notesForDoctor: "",
    participants,
    attachments: [],
    extras: {
      meetingId,
      patientDetails,
    },
    badExperienceDoctor: null,
    badExperiencePatient: null,
    reasonForCancellation: null,
    jobName: "", // This will be set by the backend
    booking_type: "web",
    timezone,
    appliedCoupon,
    couponDiscount,
    ...(patientWhatsApp ? { patientWhatsApp } : {}),
    ...(doctorWhatsApp ? { doctorWhatsApp } : {}),
    wa_noti_15min: false,
  };
};

// Type guard to check if an object is a Consultation
export const isConsultation = (obj: unknown): obj is Consultation => {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "consultationId" in obj &&
    "patientName" in obj &&
    "doctorName" in obj
  );
};
