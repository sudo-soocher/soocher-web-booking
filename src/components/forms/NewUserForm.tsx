"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, SelectItem } from "@nextui-org/react";
import { db } from "@/lib/firebase";
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <Input
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <Input
        label="Date of Birth"
        type="date"
        value={formData.dob}
        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
        required
      />

      <Select
        label="Gender"
        value={formData.gender}
        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
        required
      >
        <SelectItem key="Male" value="Male">
          Male
        </SelectItem>
        <SelectItem key="Female" value="Female">
          Female
        </SelectItem>
        <SelectItem key="Other" value="Other">
          Other
        </SelectItem>
      </Select>

      <Input
        label="State"
        value={formData.currentState}
        onChange={(e) =>
          setFormData({ ...formData, currentState: e.target.value })
        }
        required
      />

      <Input
        label="City"
        value={formData.currentCity}
        onChange={(e) =>
          setFormData({ ...formData, currentCity: e.target.value })
        }
        required
      />

      <Button
        color="primary"
        type="submit"
        className="w-full"
        isLoading={loading}
      >
        Continue to Payment
      </Button>
    </form>
  );
}
