"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  Button,
  Input,
  Avatar,
  Select,
  SelectItem,
} from "@nextui-org/react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { FaArrowLeft, FaUser, FaSave } from "react-icons/fa";
import { motion } from "framer-motion";
import { Patient } from "@/types/patient";

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    currentState: "",
    currentCity: "",
    allergies: "",
    regularMedications: "",
    medicalConditions: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) {
        router.push("/login");
        return;
      }

      try {
        const docRef = doc(db, "Users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Patient;
          setProfile(data);
          setFormData({
            name: data.name || "",
            dob: new Date(data.dob).toISOString().split("T")[0],
            gender: data.gender || "",
            currentState: data.currentState || "",
            currentCity: data.currentCity || "",
            allergies: data.allergies || "",
            regularMedications: data.regularMedications || "",
            medicalConditions: data.medicalConditions || "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    if (!auth.currentUser) return;

    setSaving(true);
    try {
      const dobDate = new Date(formData.dob);
      const updatedData = {
        ...profile,
        name: formData.name,
        dob: dobDate.getTime(),
        gender: formData.gender,
        currentState: formData.currentState,
        currentCity: formData.currentCity,
        allergies: formData.allergies,
        regularMedications: formData.regularMedications,
        medicalConditions: formData.medicalConditions,
      };

      await updateDoc(doc(db, "Users", auth.currentUser.uid), updatedData);
      // Show success message or notification
    } catch (error) {
      console.error("Error updating profile:", error);
      // Show error message
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardBody className="p-8">
              <div className="space-y-6 animate-pulse">
                <div className="h-32 w-32 rounded-full bg-gray-200 mx-auto" />
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="light"
            startContent={<FaArrowLeft />}
            onPress={() => router.back()}
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Profile</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardBody className="p-8">
              <div className="flex flex-col items-center mb-8">
                <Avatar
                  className="w-32 h-32 text-large mb-4"
                  src={profile?.profileImage}
                  name={profile?.name}
                  showFallback
                  isBordered
                  color="primary"
                />
                <h2 className="text-xl font-semibold">{profile?.name}</h2>
                <p className="text-gray-600">
                  {profile?.phoneNumber || auth.currentUser?.email}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />

                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData({ ...formData, dob: e.target.value })
                  }
                />

                <Select
                  label="Gender"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
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
                />

                <Input
                  label="City"
                  value={formData.currentCity}
                  onChange={(e) =>
                    setFormData({ ...formData, currentCity: e.target.value })
                  }
                />

                <Input
                  label="Allergies"
                  value={formData.allergies}
                  onChange={(e) =>
                    setFormData({ ...formData, allergies: e.target.value })
                  }
                />

                <Input
                  label="Regular Medications"
                  value={formData.regularMedications}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      regularMedications: e.target.value,
                    })
                  }
                />

                <Input
                  label="Medical Conditions"
                  value={formData.medicalConditions}
                  className="md:col-span-2"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      medicalConditions: e.target.value,
                    })
                  }
                />
              </div>

              <Button
                color="primary"
                className="w-full mt-8"
                startContent={<FaSave />}
                isLoading={saving}
                onPress={handleSave}
              >
                Save Changes
              </Button>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
