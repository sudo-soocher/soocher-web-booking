export interface FamilyMember {
  // You can expand this based on your needs
  name: string;
  relation: string;
  dob?: number;
  gender?: string;
}

export interface Patient {
  // Personal Information
  uid: string;
  name: string;
  dob: number; // Unix timestamp
  gender: "Male" | "Female" | "Other";
  phoneNumber: string;
  email: string;
  type: "PATIENT";

  // Location
  currentCity: string;
  currentState: string;

  // Medical Information
  allergies: string;
  regularMedications: string;
  medicalConditions: string;

  // Profile
  profileImage: string;
  familyMembers: FamilyMember[];

  // System Fields
  dateOfAccountCreation: number; // Unix timestamp
  fcmToken: string;
  stream_token: string;
}

// Helper function to format date
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString();
};

// Helper function to calculate age
export const calculateAge = (dob: number): number => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Type guard to check if an object is a Patient
export const isPatient = (user: unknown): user is Patient => {
  return (
    user !== null &&
    typeof user === "object" &&
    "type" in user &&
    (user as { type: string }).type === "PATIENT"
  );
};

// Function to create a new patient object with default values
export const createNewPatient = (
  uid: string,
  name: string,
  phoneNumber: string,
  email: string
): Patient => {
  return {
    uid,
    name,
    phoneNumber,
    email,
    type: "PATIENT",
    dob: 0,
    gender: "Other",
    currentCity: "",
    currentState: "",
    allergies: "",
    regularMedications: "",
    medicalConditions: "",
    profileImage: "",
    familyMembers: [],
    dateOfAccountCreation: Date.now(),
    fcmToken: "",
    stream_token: "",
  };
};
