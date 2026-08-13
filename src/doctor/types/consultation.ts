import type { ConsultationMode, Gender } from "./doctor";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email?: string;
  bloodGroup?: string;
  allergies?: string[];
}

export interface Medicine {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  patientName: string;
  patientAge: number;
  doctorName: string;
  doctorQualification?: string;
  doctorRegNo?: string;
  date: string;
  diagnosis: string;
  medicines: Medicine[];
  advice?: string;
  followUpDate?: string;
}

export interface ConsultationRecord {
  id: string;
  doctorId: string;
  patient: Patient;
  date: string;
  startTime: string;
  endTime: string;
  mode: ConsultationMode;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  symptoms?: string[];
  chiefComplaint?: string;
  pastHistory?: string;
  vitals?: { bp?: string; pulse?: string; temp?: string; weight?: string; height?: string };
  prescription?: Prescription;
  clinicalNotes?: string;
  followUpDate?: string;
}
