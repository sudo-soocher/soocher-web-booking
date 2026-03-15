"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, SelectItem, Textarea } from "@nextui-org/react";
import { db } from "@/lib/firebase";
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Age"
          type="number"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          required
        />

        <Select
          label="Gender"
          value={formData.gender}
          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          required
        >
          <SelectItem key="male" value="male">
            Male
          </SelectItem>
          <SelectItem key="female" value="female">
            Female
          </SelectItem>
          <SelectItem key="other" value="other">
            Other
          </SelectItem>
        </Select>
      </div>

      <Input
        label="Phone Number"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <Textarea
        label="Symptoms"
        value={formData.symptoms}
        onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
        required
      />

      <Textarea
        label="Previous Medical History (Optional)"
        value={formData.previousHistory}
        onChange={(e) =>
          setFormData({ ...formData, previousHistory: e.target.value })
        }
      />

      <Button
        color="primary"
        type="submit"
        className="w-full"
        isLoading={loading}
      >
        Confirm Booking
      </Button>
    </form>
  );
}
