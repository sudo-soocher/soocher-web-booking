"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FaChevronDown } from "react-icons/fa";
import { db } from "@/lib/firebase-db";
import { doc, setDoc } from "firebase/firestore";
import { Patient, createNewPatient } from "@/types/patient";

interface NewUserFormProps {
  uid: string;
  phoneNumber: string;
  email?: string;
  onSuccess: () => void;
}

export default function NewUserForm({
  uid,
  phoneNumber,
  email: initialEmail,
  onSuccess,
}: NewUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: initialEmail || "",
    dob: "",
    gender: "",
    currentState: "",
    currentCity: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dobDate = new Date(formData.dob);
      const patient: Patient = createNewPatient(
        uid,
        formData.name,
        phoneNumber,
        formData.email
      );

      // Update with form data
      patient.dob = dobDate.getTime();
      patient.gender = formData.gender as "Male" | "Female" | "Other";
      patient.currentState = formData.currentState;
      patient.currentCity = formData.currentCity;

      // Save to Firestore
      await setDoc(doc(db, "Users", uid), patient);
      onSuccess();
    } catch (error) {
      console.error("Error saving user data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">Full Name <span className="text-rose-500">*</span></span>
        <input
        className="patient-form-control"
        placeholder="Enter your full name"
        autoComplete="name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">Email Address <span className="text-rose-500">*</span></span>
        <input
        className="patient-form-control"
        placeholder="name@example.com"
        autoComplete="email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">Date of Birth <span className="text-rose-500">*</span></span>
        <input
        className="patient-form-control patient-form-date"
        aria-label="Date of Birth"
        type="date"
        value={formData.dob}
        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
        required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">Gender <span className="text-rose-500">*</span></span>
        <span className="relative block">
          <select
        className={`patient-form-control appearance-none pr-11 ${formData.gender ? "text-slate-900" : "text-slate-400"}`}
        aria-label="Gender"
        value={formData.gender}
        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
        required
      >
            <option value="" disabled>Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-slate-400" />
        </span>
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">State <span className="text-rose-500">*</span></span>
        <input
        className="patient-form-control"
        placeholder="Enter your state"
        autoComplete="address-level1"
        value={formData.currentState}
        onChange={(e) =>
          setFormData({ ...formData, currentState: e.target.value })
        }
        required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">City <span className="text-rose-500">*</span></span>
        <input
        className="patient-form-control"
        placeholder="Enter your city"
        autoComplete="address-level2"
        value={formData.currentCity}
        onChange={(e) =>
          setFormData({ ...formData, currentCity: e.target.value })
        }
        required
        />
      </label>
      </div>

      <Button
        color="primary"
        type="submit"
        className="h-14 w-full rounded-2xl text-sm font-bold shadow-lg shadow-primary/20"
        isLoading={loading}
      >
        Continue to Payment
      </Button>
    </form>
  );
}
