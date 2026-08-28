const SPECIALITY_IMAGES: Record<string, string> = {
  "General Physician (M.B.B.S)": "/specialities/thumb/general-physician.webp",
  "Physical Medicine and Rehabilitation": "/specialities/thumb/physical-medicine-rehabilitation.webp",
  "Family Medicine": "/specialities/thumb/family-medicine.webp",
  Dermatology: "/specialities/thumb/dermatology.webp",
  "Orthopaedic Surgery": "/specialities/thumb/orthopaedic-surgery.webp",
  Nephrology: "/specialities/thumb/nephrology.webp",
  "Emergency Medicine": "/specialities/thumb/emergency-medicine.webp",
  Paediatrics: "/specialities/thumb/paediatrics.webp",
  ENT: "/specialities/thumb/ent.webp",
  "Obstetrics and Gynaecology": "/specialities/thumb/obstetrics-gynaecology.webp",
  Pathology: "/specialities/thumb/pathology.webp",
  "Pulmonology & Respiratory Medicine": "/specialities/thumb/pulmonology.webp",
  Psychiatry: "/specialities/thumb/psychiatry.webp",
  Gastroenterology: "/specialities/thumb/gastroenterology.webp",
  "General Surgery": "/specialities/thumb/general-surgery.webp",
  Neurology: "/specialities/thumb/neurology.webp",
  "General Medicine": "/specialities/thumb/general-medicine.webp",
  Psychology: "/specialities/thumb/psychology.webp",
  "Dental Practitioner": "/specialities/thumb/dental-practitioner.webp",
  Endocrinology: "/specialities/thumb/endocrinology.webp",
  Ophthalmology: "/specialities/thumb/ophthalmology.webp",
  Neurosurgery: "/specialities/thumb/neurosurgery.webp",
  "Plastic and Reconstructive Surgery": "/specialities/thumb/plastic-reconstructive-surgery.webp",
  Urology: "/specialities/thumb/urology.webp",
  "Critical Care Medicine": "/specialities/thumb/critical-care.webp",
  Cardiology: "/specialities/thumb/cardiology.webp",
  Anaesthesiology: "/specialities/thumb/anaesthesiology.webp",
  "Cardiothoracic and Vascular Surgery": "/specialities/thumb/cardiothoracic-vascular-surgery.webp",
  "Gastrointestinal Surgery": "/specialities/thumb/gastrointestinal-surgery.webp",
};

export function getSpecialityImage(name: string): string | undefined {
  return SPECIALITY_IMAGES[name];
}

