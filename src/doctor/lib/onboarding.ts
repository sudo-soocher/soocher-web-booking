import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/doctor/lib/firebase";
import type { Doctor } from "@/doctor/types/doctor";

export interface StepMeta {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
}

export const STEPS: StepMeta[] = [
  { slug: "basic", title: "Basic info", description: "Tell us who you are.", eyebrow: "Step 1 of 12" },
  { slug: "contact", title: "Contact", description: "How patients and we can reach you.", eyebrow: "Step 2 of 12" },
  { slug: "speciality", title: "Speciality", description: "Your primary area of practice.", eyebrow: "Step 3 of 12" },
  { slug: "expertise", title: "Expertise & procedures", description: "Conditions you treat and procedures you perform.", eyebrow: "Step 4 of 12" },
  { slug: "about", title: "About you", description: "A short bio that appears next to your photo.", eyebrow: "Step 5 of 12" },
  { slug: "licence", title: "Medical licence", description: "We verify every doctor on Soocher.", eyebrow: "Step 6 of 12" },
  { slug: "education", title: "Education & training", description: "Where you trained — most recent first.", eyebrow: "Step 7 of 12" },
  { slug: "experience", title: "Work experience", description: "Positions you've held — most recent first.", eyebrow: "Step 8 of 12" },
  { slug: "achievements", title: "Achievements", description: "Certifications, awards, publications, talks.", eyebrow: "Step 9 of 12" },
  { slug: "languages", title: "Languages spoken", description: "Patients can filter doctors by language.", eyebrow: "Step 10 of 12" },
  { slug: "schedule", title: "Consultation schedule", description: "Set your availability — you can edit this later.", eyebrow: "Step 11 of 12" },
  { slug: "finance", title: "Finance setup", description: "Fees and how you'd like to be paid.", eyebrow: "Step 12 of 12" },
];

export const STEP_SLUGS = STEPS.map((s) => s.slug);

export function getStepIndex(slug: string) {
  return STEPS.findIndex((s) => s.slug === slug);
}

export function getNextStepSlug(slug: string): string | null {
  const i = getStepIndex(slug);
  if (i < 0 || i >= STEPS.length - 1) return null;
  return STEPS[i + 1].slug;
}

export function getPrevStepSlug(slug: string): string | null {
  const i = getStepIndex(slug);
  if (i <= 0) return null;
  return STEPS[i - 1].slug;
}

export function resumeStepSlug(profile: Pick<Doctor, "onboardingStep"> | null): string {
  const i = (profile?.onboardingStep ?? 1) - 1;
  return STEPS[Math.min(Math.max(i, 0), STEPS.length - 1)].slug;
}

/** Firestore rejects `undefined` — strip those keys before writing. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * The backend admin panel uses an older field-name vocabulary
 * (name / specialization / currentCity / mciNumber / consultationFees / …).
 * This app uses semantic names (fullName / primarySpeciality / city / …).
 *
 * For every step write, mirror the relevant pieces into the admin's expected
 * field names so the admin list shows real data ("Dr. Hansika Motwani" instead
 * of "Unknown Doctor"). Cheap to write, avoids forcing the admin team to
 * touch their UI.
 */
export function mirrorAdminFields(slice: Partial<Doctor>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (slice.fullName !== undefined) m.name = slice.fullName;
  if (slice.primarySpeciality !== undefined) m.specialization = slice.primarySpeciality;
  if (slice.city !== undefined) m.currentCity = slice.city;
  if (slice.state !== undefined) m.currentState = slice.state;
  if (slice.registrationNumber !== undefined) m.mciNumber = slice.registrationNumber;
  if (slice.profilePhotoUrl !== undefined) m.profileImage = slice.profilePhotoUrl;
  if (slice.yearsOfExperience !== undefined) m.numExp = String(slice.yearsOfExperience);
  if (slice.videoConsultFee !== undefined) m.consultationFees = String(slice.videoConsultFee);
  if (slice.bio !== undefined) m.aboutMe = slice.bio;
  if (slice.licenceDocUrl !== undefined) m.mciUploadUrl = slice.licenceDocUrl;
  // admin field is `upiID` (capital ID); we keep both for safety.
  if (slice.upiId !== undefined) m.upiID = slice.upiId;
  if (slice.languages !== undefined) {
    m.knownLanguages = slice.languages;
    m.languagesKnown = slice.languages;
  }
  return m;
}

/**
 * Doctors are stored in the shared `Users` collection (same one the patient app uses),
 * distinguished by `type: "DOCTOR"`. See `src/lib/auth.tsx`.
 */
const USERS_COLLECTION = "Users";

/** Write a slice of doctor data, then advance onboardingStep to at least `nextStep`. */
export async function saveStep(
  uid: string,
  slice: Partial<Doctor>,
  nextStep: number
) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...stripUndefined(slice),
    ...mirrorAdminFields(slice),
    onboardingStep: nextStep,
    updatedAt: serverTimestamp(),
  });
}

/** Final submission — mark complete + timestamp. Profile then enters admin review. */
export async function submitOnboarding(uid: string, slice: Partial<Doctor>) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...stripUndefined(slice),
    ...mirrorAdminFields(slice),
    onboardingStep: STEPS.length,
    onboardingComplete: true,
    // documentsSubmitted: true is the signal the admin uses to surface the
    // doctor in the Pending Verification bucket. Set it only here — i.e. only
    // after all required onboarding values are in Firestore.
    documentsSubmitted: true,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // TODO: trigger WhatsApp notification to the doctor + admin via a Cloud Function
  // (matches the patient app's `/api/notify-whatsapp` pattern — wire up when backend is ready).
}

export async function uploadDoctorFile(uid: string, kind: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `doctors/${uid}/${kind}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

/* ---------- Reference data (small enough to inline; move to Firestore later if needed) ---------- */

/**
 * All 28 states + 8 union territories of India, sorted alphabetically.
 * Source: Ministry of Home Affairs (post-2020 reorganisation).
 */
export const INDIAN_STATES = [
  // States (28)
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories (8)
  "Andaman & Nicobar Islands",
  "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
].sort((a, b) => a.localeCompare(b));

/**
 * ISO 3166-1 alpha-2 country list, pre-sorted by name.
 * Stored as `{code}` on the doctor record so the value is portable and
 * locale-agnostic; the dropdown shows the English name.
 */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "AF", name: "Afghanistan" }, { code: "AL", name: "Albania" }, { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" }, { code: "AO", name: "Angola" }, { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" }, { code: "AM", name: "Armenia" }, { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" }, { code: "AZ", name: "Azerbaijan" }, { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" }, { code: "BD", name: "Bangladesh" }, { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" }, { code: "BE", name: "Belgium" }, { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" }, { code: "BT", name: "Bhutan" }, { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" }, { code: "BW", name: "Botswana" }, { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" }, { code: "BG", name: "Bulgaria" }, { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" }, { code: "CV", name: "Cabo Verde" }, { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" }, { code: "CA", name: "Canada" }, { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" }, { code: "CL", name: "Chile" }, { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" }, { code: "KM", name: "Comoros" }, { code: "CG", name: "Congo (Brazzaville)" },
  { code: "CD", name: "Congo (Kinshasa)" }, { code: "CR", name: "Costa Rica" }, { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" }, { code: "CU", name: "Cuba" }, { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" }, { code: "DK", name: "Denmark" }, { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" }, { code: "DO", name: "Dominican Republic" }, { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" }, { code: "SV", name: "El Salvador" }, { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" }, { code: "EE", name: "Estonia" }, { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" }, { code: "FJ", name: "Fiji" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "GA", name: "Gabon" }, { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" }, { code: "DE", name: "Germany" }, { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" }, { code: "GD", name: "Grenada" }, { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" }, { code: "GW", name: "Guinea-Bissau" }, { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" }, { code: "HN", name: "Honduras" }, { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" }, { code: "IS", name: "Iceland" }, { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" }, { code: "IR", name: "Iran" }, { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" }, { code: "IL", name: "Israel" }, { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" }, { code: "JP", name: "Japan" }, { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" }, { code: "KE", name: "Kenya" }, { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" }, { code: "KG", name: "Kyrgyzstan" }, { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" }, { code: "LB", name: "Lebanon" }, { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" }, { code: "LY", name: "Libya" }, { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" }, { code: "MO", name: "Macao" },
  { code: "MG", name: "Madagascar" }, { code: "MW", name: "Malawi" }, { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" }, { code: "ML", name: "Mali" }, { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" }, { code: "MR", name: "Mauritania" }, { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" }, { code: "FM", name: "Micronesia" }, { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" }, { code: "MN", name: "Mongolia" }, { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" }, { code: "MZ", name: "Mozambique" }, { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" }, { code: "NR", name: "Nauru" }, { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" }, { code: "NZ", name: "New Zealand" }, { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" }, { code: "NG", name: "Nigeria" }, { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" }, { code: "NO", name: "Norway" }, { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" }, { code: "PW", name: "Palau" }, { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" }, { code: "PG", name: "Papua New Guinea" }, { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" }, { code: "PH", name: "Philippines" }, { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" }, { code: "QA", name: "Qatar" }, { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" }, { code: "RW", name: "Rwanda" }, { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" }, { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" }, { code: "SM", name: "San Marino" }, { code: "ST", name: "São Tomé and Príncipe" },
  { code: "SA", name: "Saudi Arabia" }, { code: "SN", name: "Senegal" }, { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" }, { code: "SL", name: "Sierra Leone" }, { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" }, { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" }, { code: "ZA", name: "South Africa" }, { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" }, { code: "ES", name: "Spain" }, { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" }, { code: "SR", name: "Suriname" }, { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" }, { code: "SY", name: "Syria" }, { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" }, { code: "TZ", name: "Tanzania" }, { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" }, { code: "TG", name: "Togo" }, { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" }, { code: "TN", name: "Tunisia" }, { code: "TR", name: "Türkiye" },
  { code: "TM", name: "Turkmenistan" }, { code: "TV", name: "Tuvalu" }, { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" }, { code: "AE", name: "United Arab Emirates" }, { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" }, { code: "UY", name: "Uruguay" }, { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" }, { code: "VA", name: "Vatican City" }, { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" }, { code: "YE", name: "Yemen" }, { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
].sort((a, b) => a.name.localeCompare(b.name));

export const SPECIALITIES = [
  "General Medicine", "General Surgery", "Family Medicine", "Internal Medicine",
  "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology", "Gynecology",
  "Neurology", "Nephrology", "Oncology", "Ophthalmology", "Orthopedics",
  "Pediatrics", "Psychiatry", "Pulmonology", "Radiology", "Urology", "Dentistry",
  "ENT (Otorhinolaryngology)", "Hematology", "Rheumatology", "Anesthesiology",
  "Pathology", "Emergency Medicine", "Plastic Surgery", "Neurosurgery",
  "Cardiothoracic Surgery", "Sexology", "Ayurveda", "Homoeopathy", "Physiotherapy",
];

export const MEDICAL_COUNCILS = [
  "National Medical Commission (NMC)",
  "Andhra Pradesh Medical Council",
  "Bihar Medical Council",
  "Delhi Medical Council",
  "Gujarat Medical Council",
  "Karnataka Medical Council",
  "Kerala Medical Council",
  "Madhya Pradesh Medical Council",
  "Maharashtra Medical Council",
  "Punjab Medical Council",
  "Rajasthan Medical Council",
  "Tamil Nadu Medical Council",
  "Telangana State Medical Council",
  "Uttar Pradesh Medical Council",
  "West Bengal Medical Council",
];

export const INDIAN_LANGUAGES = [
  "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu", "Gujarati",
  "Kannada", "Odia", "Malayalam", "Punjabi", "Assamese", "Maithili", "Sanskrit",
  "Konkani", "Nepali", "Sindhi", "Kashmiri", "Dogri", "Manipuri", "Bodo", "Santali",
];

import type { WeeklyTimeSlots } from "@/doctor/types/doctor";

export const DEFAULT_TIME_SLOTS: WeeklyTimeSlots = {
  monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
};
