const SPECIALITY_IMAGES: Record<string, string> = {
  "General Physician (M.B.B.S)": "/specialities/general-physician.jpg",
  "Physical Medicine and Rehabilitation": "/specialities/physical-medicine-rehabilitation.jpg",
  "Family Medicine": "/specialities/family-medicine.jpg",
  Dermatology: "/specialities/dermatology.jpg",
  "Orthopaedic Surgery": "/specialities/orthopaedic-surgery.jpg",
  Nephrology: "/specialities/nephrology.jpg",
  "Emergency Medicine": "/specialities/emergency-medicine.jpg",
  Paediatrics: "/specialities/paediatrics.jpg",
  ENT: "/specialities/ent.jpg",
  "Obstetrics and Gynaecology": "/specialities/obstetrics-gynaecology.jpg",
  Pathology: "/specialities/pathology.jpg",
  "Pulmonology & Respiratory Medicine": "/specialities/pulmonology.jpg",
  Psychiatry: "/specialities/psychiatry.jpg",
  Gastroenterology: "/specialities/gastroenterology.jpg",
  "General Surgery": "/specialities/general-surgery.jpg",
  Neurology: "/specialities/neurology.jpg",
  "General Medicine": "/specialities/general-medicine.jpg",
  Psychology: "/specialities/psychology.jpg",
  "Dental Practitioner": "/specialities/dental-practitioner.jpg",
  Endocrinology: "/specialities/endocrinology.jpg",
  Ophthalmology: "/specialities/ophthalmology.jpg",
  Neurosurgery: "/specialities/neurosurgery.jpg",
  "Plastic and Reconstructive Surgery": "/specialities/plastic-reconstructive-surgery.jpg",
  Urology: "/specialities/urology.jpg",
  "Critical Care Medicine": "/specialities/critical-care.jpg",
  Cardiology: "/specialities/cardiology.jpg",
  Anaesthesiology: "/specialities/anaesthesiology.jpg",
  "Cardiothoracic and Vascular Surgery": "/specialities/cardiothoracic-vascular-surgery.jpg",
  "Gastrointestinal Surgery": "/specialities/gastrointestinal-surgery.jpg",
};

export function getSpecialityImage(name: string): string | undefined {
  return SPECIALITY_IMAGES[name];
}

