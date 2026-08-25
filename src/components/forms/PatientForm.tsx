"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FaChevronDown } from "react-icons/fa";
import { db } from "@/lib/firebase-db";
import { addDoc, collection } from "firebase/firestore";

interface PatientFormProps {
  doctorId: string;
  selectedSlot: string;
  onSuccess: () => void;
}

interface PatientDetails {
  name: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  symptoms: string;
  previousHistory?: string;
}

export default function PatientForm({
  doctorId,
  selectedSlot,
  onSuccess,
}: PatientFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PatientDetails>({
    name: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    symptoms: "",
    previousHistory: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "bookings"), {
        doctorId,
        slot: selectedSlot,
        patientDetails: formData,
        status: "pending",
        createdAt: new Date().getTime(),
      });

      onSuccess();
    } catch (error) {
      console.error("Error booking appointment:", error);
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
        placeholder="Enter patient name"
        autoComplete="name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        />
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-700">Age <span className="text-rose-500">*</span></span>
          <input
          className="patient-form-control"
          placeholder="Enter age"
          type="number"
          min="0"
          max="120"
          inputMode="numeric"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
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
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-slate-400" />
          </span>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">Phone Number <span className="text-rose-500">*</span></span>
        <input
        className="patient-form-control"
        placeholder="Enter phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">Email <span className="text-rose-500">*</span></span>
        <input
        className="patient-form-control"
        placeholder="name@example.com"
        type="email"
        autoComplete="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">Symptoms <span className="text-rose-500">*</span></span>
        <textarea
        className="patient-form-control min-h-28 resize-y py-3.5 leading-5"
        placeholder="Describe the patient’s symptoms"
        value={formData.symptoms}
        onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
        required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-slate-700">Previous Medical History <span className="font-medium text-slate-400">(Optional)</span></span>
        <textarea
        className="patient-form-control min-h-24 resize-y py-3.5 leading-5"
        placeholder="Add any relevant medical history"
        value={formData.previousHistory}
        onChange={(e) =>
          setFormData({ ...formData, previousHistory: e.target.value })
        }
        />
      </label>

      <Button
        color="primary"
        type="submit"
        className="h-14 w-full rounded-2xl text-sm font-bold shadow-lg shadow-primary/20"
        isLoading={loading}
      >
        Confirm Booking
      </Button>
    </form>
  );
}
