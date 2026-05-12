/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select, SelectItem, Avatar } from "@nextui-org/react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FaArrowLeft, FaUser, FaSave, FaStethoscope, FaNotesMedical, FaCamera } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Patient } from "@/types/patient";
import { Footer } from "@/components/layout/Footer";
import { storage } from "@/lib/firebase";
import { Logo } from "@/components/ui/Logo";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [profile, setProfile] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
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
            email: data.email || auth.currentUser?.email || "",
            phoneNumber: data.phoneNumber || "",
            dob: data.dob ? new Date(data.dob).toISOString().split("T")[0] : "",
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('File is too large. Please choose an image under 2MB.');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${auth.currentUser.uid}/avatar`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update local profile state
      const updatedProfile = { ...profile!, profileImage: downloadURL };
      setProfile(updatedProfile as Patient);

      // Update Firestore immediately for the image
      await setDoc(doc(db, "Users", auth.currentUser.uid), {
        profileImage: downloadURL
      }, { merge: true });

    } catch (error) {
      console.error("Error uploading image:", error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    setSaving(true);
    setShowSuccess(false);
    try {
      const dobDate = formData.dob ? new Date(formData.dob) : null;
      
      const updatedData: any = {
        ...profile,
        name: formData.name || "",
        email: formData.email || "",
        phoneNumber: formData.phoneNumber || "",
        dob: dobDate && !isNaN(dobDate.getTime()) ? dobDate.getTime() : (profile?.dob || 0),
        gender: formData.gender || "Other",
        currentState: formData.currentState || "",
        currentCity: formData.currentCity || "",
        allergies: formData.allergies || "",
        regularMedications: formData.regularMedications || "",
        medicalConditions: formData.medicalConditions || "",
      };

      if (!profile) {
        updatedData.uid = auth.currentUser.uid;
        updatedData.email = auth.currentUser.email || "";
        updatedData.type = "PATIENT";
        updatedData.dateOfAccountCreation = Date.now();
      }

      await setDoc(doc(db, "Users", auth.currentUser.uid), updatedData, { merge: true });
      setProfile(updatedData as Patient);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to save profile. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <header className="px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
              <div className="w-24 h-6 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="premium-card p-12 space-y-8 animate-pulse bg-slate-50 border-none">
            <div className="w-32 h-32 rounded-[40px] bg-slate-200 mx-auto" />
            <div className="space-y-6">
              <div className="h-12 bg-slate-200 rounded-2xl w-full" />
              <div className="h-12 bg-slate-200 rounded-2xl w-full" />
              <div className="h-32 bg-slate-200 rounded-2xl w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full px-4 md:px-6 py-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-4 md:px-6 py-3 border border-white/40 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <Logo size="md" className="shadow-lg shadow-primary/20 rounded-xl" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Soocher</h1>
          </div>
          <Button
            variant="flat"
            size="sm"
            className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
            startContent={<FaArrowLeft className="text-xs" />}
            onPress={() => router.back()}
          >
            Back
          </Button>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-24">
        <div className="space-y-8 md:space-y-12">
          {/* Page Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              Personal <span className="text-primary italic">Profile</span>
            </h1>
            <p className="text-sm md:text-base text-slate-500 font-medium tracking-tight">Manage your medical identity and preferences.</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-6 sm:p-8 md:p-12 border-none ring-1 ring-slate-100"
          >
            {/* Profile Header */}
            <div className="flex flex-col items-center mb-8 md:mb-12 space-y-4">
              <div className="relative group">
                <input
                  type="file"
                  id="profile-image-input"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                <label
                  htmlFor="profile-image-input"
                  className={`relative block transition-all duration-300 ${uploading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                >
                  <Avatar
                    className="w-32 h-32 md:w-40 md:h-40 text-large rounded-[48px] shadow-2xl shadow-primary/10 border-4 border-white"
                    src={profile?.profileImage}
                    name={profile?.name}
                    showFallback
                    fallback={<FaUser className="text-4xl text-slate-300" />}
                  />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FaCamera className="text-sm" />
                    )}
                  </div>
                </label>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-900">{profile?.name || "Patient Name"}</h2>
                {uploading && (
                  <p className="text-primary font-bold text-[10px] uppercase tracking-widest mt-2 animate-pulse">
                    Uploading your new look...
                  </p>
                )}
                {!uploading && (
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mt-1">
                    ID: {auth.currentUser?.uid.slice(0, 8)}
                  </p>
                )}
              </div>
            </div>

            {/* Form Sections */}
            <div className="space-y-12">
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm">
                    <FaUser />
                  </span>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    variant="bordered"
                    radius="lg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    classNames={{ inputWrapper: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    variant="bordered"
                    radius="lg"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    classNames={{ inputWrapper: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                  />
                  <div className="flex flex-col gap-1.5 justify-center">
                    <label className="text-[0.75rem] font-bold text-slate-400">Mobile Number</label>
                    <div className="border-2 border-slate-200 rounded-lg bg-slate-50 opacity-70 cursor-not-allowed">
                      <PhoneInput
                        defaultCountry="in"
                        value={formData.phoneNumber}
                        onChange={() => {}}
                        disabled
                        inputProps={{ readOnly: true, disabled: true }}
                        inputStyle={{
                          width: '100%',
                          height: '3rem',
                          border: 'none',
                          fontSize: '0.875rem',
                          backgroundColor: 'transparent',
                          outline: 'none',
                          boxShadow: 'none',
                          cursor: 'not-allowed',
                        }}
                        countrySelectorStyleProps={{
                          buttonStyle: {
                            height: '3rem',
                            border: 'none',
                            borderRight: '2px solid #e2e8f0',
                            backgroundColor: 'transparent',
                            padding: '0 0.5rem',
                          },
                          dropdownStyleProps: {
                            style: {
                              zIndex: 50
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <Input
                    label="Date of Birth"
                    type="date"
                    variant="bordered"
                    radius="lg"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    classNames={{ inputWrapper: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                  />
                  <Select
                    label="Gender"
                    variant="bordered"
                    radius="lg"
                    selectedKeys={[formData.gender]}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    classNames={{ trigger: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                  >
                    <SelectItem key="Male" value="Male">Male</SelectItem>
                    <SelectItem key="Female" value="Female">Female</SelectItem>
                    <SelectItem key="Other" value="Other">Other</SelectItem>
                  </Select>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="State"
                      variant="bordered"
                      radius="lg"
                      value={formData.currentState}
                      onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                      classNames={{ inputWrapper: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                    />
                    <Input
                      label="City"
                      variant="bordered"
                      radius="lg"
                      value={formData.currentCity}
                      onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
                      classNames={{ inputWrapper: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-success/10 text-success flex items-center justify-center text-sm">
                    <FaNotesMedical />
                  </span>
                  Medical Profile
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <Input
                    label="Known Allergies"
                    variant="bordered"
                    radius="lg"
                    value={formData.allergies}
                    placeholder="e.g. Peanuts, Penicillin..."
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    classNames={{ inputWrapper: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                  />
                  <Input
                    label="Regular Medications"
                    variant="bordered"
                    radius="lg"
                    value={formData.regularMedications}
                    placeholder="e.g. Insulin, Aspirin..."
                    onChange={(e) => setFormData({ ...formData, regularMedications: e.target.value })}
                    classNames={{ inputWrapper: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                  />
                  <Input
                    label="Medical Conditions"
                    variant="bordered"
                    radius="lg"
                    value={formData.medicalConditions}
                    placeholder="e.g. Diabetes, Hypertension..."
                    className="md:col-span-2"
                    onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                    classNames={{ inputWrapper: "border-slate-200 hover:border-primary/50", label: "font-bold text-slate-400" }}
                  />
                </div>
              </div>

              <div className="pt-8">
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20 text-success text-center font-bold flex justify-center items-center gap-2"
                    >
                      <FaSave className="text-lg" />
                      Profile Enshrined Successfully!
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button
                  color="primary"
                  size="lg"
                  className="w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-primary/20"
                  startContent={!saving && <FaSave className="opacity-60 text-sm" />}
                  isLoading={saving}
                  onPress={handleSave}
                >
                  {saving ? "Synthesizing Changes..." : "Enshrine Profile"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
