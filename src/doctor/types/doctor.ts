export type Gender = "male" | "female" | "other" | "prefer-not-to-say";
export type PayoutMethod = "upi" | "bank";
export type ExpertiseType = "expertise" | "procedure";
export type AchievementType =
  | "certification"
  | "award"
  | "media"
  | "publication"
  | "talk";

export interface ExpertiseItem {
  id: string;
  name: string;
  type: ExpertiseType;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fromYear: number | "";
  toYear: number | "";
}

export interface ExperienceItem {
  id: string;
  organisation: string;
  role: string;
  fromYear: number | "";
  toYear: number | "";
  isCurrent: boolean;
  city: string;
  state: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  type: AchievementType;
  year: number | "";
  description?: string;
}

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface TimeSlot {
  enabled: boolean;
  /** 24-hour HH:mm */
  startTime: string;
  /** 24-hour HH:mm */
  endTime: string;
}

export type WeeklyTimeSlots = Record<DayKey, TimeSlot>;

/** Full doctor record. Every onboarding step writes a slice of this into `Users/{uid}` (type: "DOCTOR"). */
export interface Doctor {
  // System
  uid: string;
  isVerified: boolean;
  isOnDuty?: boolean;
  onboardingComplete: boolean;
  onboardingStep?: number; // 1-12, tracks progress mid-flow
  submittedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;

  // O1 Basic info
  fullName?: string;
  dob?: string;
  gender?: Gender;
  profilePhotoUrl?: string;
  country?: string;
  state?: string;
  city?: string;
  timezone?: string;

  // O2 Contact
  email?: string;
  mobile?: string;
  whatsappSameAsMobile?: boolean;
  whatsapp?: string;
  clinicLandline?: string;

  // O3 Speciality
  primarySpeciality?: string;
  subSpecialities?: string[];
  yearsOfExperience?: number;

  // O4 Expertise & procedures
  expertiseItems?: ExpertiseItem[];

  // O5 About
  bio?: string;
  consultationApproach?: string;

  // O6 Licence
  medicalCouncil?: string;
  registrationNumber?: string;
  registrationDate?: string;
  validUntil?: string;
  licenceDocUrl?: string;
  aadhaarNumber?: string;

  // O7 Education
  education?: EducationItem[];

  // O8 Experience
  workExperience?: ExperienceItem[];

  // O9 Achievements
  achievements?: AchievementItem[];

  // O10 Languages
  languages?: string[];

  // O11 Schedule — matches the admin schema exactly (see DoctorsShadcn.js).
  timeSlots?: WeeklyTimeSlots;
  /** Length of each consultation slot in minutes. */
  slotDuration?: number;
  /** Break between back-to-back slots in minutes. */
  breakBetweenSlots?: number;

  // O12 Finance
  videoConsultFee?: number;
  chatFee?: number;
  followUpFee?: number;
  payoutMethod?: PayoutMethod;
  upiId?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  panNumber?: string;
}

export type ConsultationMode = "in-clinic" | "video" | "chat";

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: ConsultationMode;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  reason?: string;
  notes?: string;
}
