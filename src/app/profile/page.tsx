/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@heroui/react";
import { auth } from "@/lib/firebase-auth";
import { db } from "@/lib/firebase-db";
import { signOut } from "firebase/auth";
import { useAuthUser } from "@/hooks/useAuthUser";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FaArrowLeft, FaUser, FaSave, FaNotesMedical, FaCamera, FaShieldAlt, FaMapMarkerAlt, FaEnvelope, FaPhoneAlt, FaCalendarAlt, FaVenusMars, FaAllergies, FaCapsules, FaHeartbeat, FaSignOutAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Patient } from "@/types/patient";
import { Footer } from "@/components/layout/Footer";
import { storage } from "@/lib/firebase-storage";
import { Logo } from "@/components/ui/Logo";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useTranslation } from "@/i18n/LanguageProvider";
import { ProfileShimmer } from "@/components/loading/ProfileShimmer";
import { clearNativeSession } from "@/lib/native-session";
import { clearCachedBookings } from "@/lib/bookings-cache";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

function ProfileFormField({
  label,
  icon,
  children,
  className = "",
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <div className="flex min-w-0 items-start gap-2 px-1 text-[11px] font-bold leading-4 text-slate-500">
        <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center text-primary/60">{icon}</span>
        <span className="min-w-0 break-words">{label}</span>
      </div>
      {children}
    </div>
  );
}

// text-base (16px) on mobile, not text-sm (14px): iOS Safari auto-zooms the
// whole page on focus for any input under 16px, which is the "page zooms in
// when I tap a field" behavior a native-feeling mobile form must not have.
// Desktop keeps the smaller size since that zoom-on-focus quirk is iOS-only.
const profileControlClass =
  "block h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-base md:text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10";

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, ready: authReady } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
  const profileFields = [formData.name, formData.email, formData.phoneNumber, formData.dob, formData.gender, formData.currentState, formData.currentCity];
  const profileCompletion = Math.round((profileFields.filter((value) => value.trim()).length / profileFields.length) * 100);

  useEffect(() => {
    // Wait for the persisted session before deciding the user is signed out —
    // `auth.currentUser` is null on every cold load until Firebase restores it.
    if (!authReady) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Patient;
          setProfile(data);
          setFormData({
            name: data.name || "",
            email: data.email || user.email || "",
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
  }, [authReady, user, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert(t('profile.imageOnly'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert(t('profile.imageTooLarge'));
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
      alert(t('profile.uploadFailed'));
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
      alert(t("profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      clearNativeSession();
      clearCachedBookings(auth.currentUser?.uid);
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setLoggingOut(false);
    }
  };

  // Same component the route-level loading.tsx renders, so the tap-to-content
  // transition is one continuous placeholder rather than two different ones.
  if (loading) {
    return <ProfileShimmer />;
  }

  return (
    <div className="mobile-app-shell min-h-[100dvh] bg-[#F5F8FD]">

      {/* ── Mobile Top Bar ───────────────────────────────────────────── */}
      <header
        className="mobile-page-header md:hidden sticky top-0 z-40"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mobile-page-header-inner">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              onClick={() => router.back()}
              className="mobile-page-back"
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label={t("nav.back")}
            >
              <FaArrowLeft className="text-[11px]" />
            </button>
            <span className="mobile-page-title">{t("profile.title")}</span>
          </div>
        </div>
      </header>

      {/* ── Desktop Navbar ───────────────────────────────────────────── */}
      <header className="hidden md:block sticky top-0 z-40 w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center rounded-[22px] bg-white/[0.78] backdrop-blur-2xl px-5 py-2.5 border border-white/90 shadow-[0_12px_36px_rgba(46,109,212,0.09)]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <Logo size="md" className="shadow-md shadow-primary/15 rounded-xl" />
            <div><h1 className="text-xl font-black leading-none tracking-tight text-slate-900">Soocher</h1><p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-primary">{t("brand.tagline")}</p></div>
          </div>
          <Button variant="flat" size="sm" className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold" startContent={<FaArrowLeft className="text-xs" />} onPress={() => router.back()}>{t("nav.backLabel")}</Button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-3 md:px-6 py-3 md:py-6 pb-safe-nav md:pb-20">
        <div className="hidden md:block mb-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">{t("profile.accountSettings")}</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">{t("profile.heading")}</h1>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">Keep your personal and medical information up to date.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="mobile-app-card relative overflow-hidden rounded-[24px] border border-white/90 bg-white/[0.72] p-3.5 shadow-[0_18px_50px_rgba(46,109,212,0.09)] backdrop-blur-xl md:p-4 lg:sticky lg:top-28 lg:self-start lg:p-5">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex items-center gap-3.5 lg:flex-col lg:text-center">
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
                  className={`relative block transition-all duration-300 ${uploading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-[1.03] active:scale-95'}`}
                >
                  {/* Uploads are capped at 2MB but render at 72–96px, so the
                      original was being downloaded at ~25x the needed size. */}
                  {profile?.profileImage ? (
                    <div className="relative w-[72px] h-[72px] md:w-20 md:h-20 lg:w-24 lg:h-24 overflow-hidden rounded-[20px] md:rounded-[22px] lg:rounded-[26px] shadow-xl shadow-primary/10 border-4 border-white bg-primary/10">
                      <RemoteImage
                        src={profile.profileImage}
                        alt={profile?.name || formData.name || "Profile photo"}
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <Avatar
                      className="w-[72px] h-[72px] md:w-20 md:h-20 lg:w-24 lg:h-24 text-large rounded-[20px] md:rounded-[22px] lg:rounded-[26px] shadow-xl shadow-primary/10 border-4 border-white"
                      name={(profile?.name || formData.name || "U").trim().charAt(0).toUpperCase()}
                      showFallback
                    />
                  )}
                  <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg border-[3px] border-white">
                    {uploading ? (
                      <div className="app-shimmer h-4 w-4 rounded-full bg-white/45" />
                    ) : (
                      <FaCamera className="text-sm" />
                    )}
                  </div>
                </label>
              </div>
              <div className="min-w-0 flex-1 lg:w-full">
                <h2 className="truncate text-base md:text-lg font-black text-slate-900">{profile?.name || "Patient Name"}</h2>
                <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">{formData.email || "Add your email"}</p>
                {uploading && (
                  <p className="mt-1 text-[9px] font-bold text-primary">
                    {t("profile.uploading")}
                  </p>
                )}
                {!uploading && (
                  <p className="text-slate-400 font-bold uppercase text-[8px] tracking-wider mt-1.5">
                    Patient ID · {auth.currentUser?.uid.slice(0, 8)}
                  </p>
                )}
              </div>
            </div>
            <div className="relative mt-3 rounded-2xl border border-white bg-white/55 p-3 shadow-sm">
              <div className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0 break-words text-[9px] font-extrabold leading-4 text-slate-600">{t("profile.completeness")}</span><span className="shrink-0 text-[10px] font-black text-primary">{profileCompletion}%</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.div initial={{ width: 0 }} animate={{ width: `${profileCompletion}%` }} className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400" /></div>
            </div>
            <div className="relative mt-3 border-t border-slate-100 pt-3">
              <LanguageSwitcher variant="row" />
            </div>
            <div className="relative mt-3 hidden space-y-2 border-t border-slate-100 pt-3 lg:block">
              <div className="flex items-center gap-2.5 rounded-xl bg-slate-50/80 p-3 text-left"><FaMapMarkerAlt className="shrink-0 text-primary" /><div className="min-w-0"><p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{t("profile.location")}</p><p className="truncate text-[10px] font-extrabold text-slate-700">{formData.currentCity || "City"}, {formData.currentState || "State"}</p></div></div>
              <p className="flex items-start gap-2 px-1 pt-1 text-[9px] leading-relaxed text-slate-400"><FaShieldAlt className="mt-0.5 shrink-0 text-emerald-500" />{t("profile.privacyNote")}</p>
            </div>
          </aside>

          <div className="space-y-3 md:space-y-4">
              <section className="mobile-app-card rounded-[24px] border border-white/90 bg-white/[0.72] p-3.5 shadow-[0_14px_40px_rgba(46,109,212,0.07)] backdrop-blur-xl md:p-4 xl:p-5">
                <div className="mb-3 flex items-center gap-2.5 md:mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm text-primary"><FaUser /></span>
                  <div className="min-w-0"><h3 className="break-words text-sm font-black leading-5 text-slate-900 md:text-base">{t("profile.personalInfo")}</h3><p className="break-words text-[9px] font-medium leading-4 text-slate-400 md:text-[10px]">{t("profile.personalBlurb")}</p></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                  <ProfileFormField label={t("profile.name")} icon={<FaUser className="text-[10px]" />}>
                    <input
                      aria-label={t("profile.name")}
                      className={profileControlClass}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </ProfileFormField>
                  <ProfileFormField label={t("profile.email")} icon={<FaEnvelope className="text-[10px]" />}>
                    <input
                      aria-label={t("profile.email")}
                      type="email"
                      className={profileControlClass}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </ProfileFormField>
                  <div className="flex flex-col gap-1.5 justify-center">
                    <label className="flex min-w-0 items-start gap-1.5 px-1 text-[11px] font-bold leading-4 text-slate-500"><FaPhoneAlt className="mt-0.5 shrink-0 text-[9px] text-primary/60" /><span className="min-w-0 break-words">{t("profile.phone")}</span></label>
                    <div className="profile-phone overflow-hidden border border-slate-200 rounded-2xl bg-slate-50/80 opacity-75 cursor-not-allowed shadow-sm">
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
                  <ProfileFormField label={t("profile.dob")} icon={<FaCalendarAlt className="text-[10px]" />}>
                    <input
                      aria-label={t("profile.dob")}
                      type="date"
                      className={profileControlClass}
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    />
                  </ProfileFormField>
                  <ProfileFormField label={t("profile.gender")} icon={<FaVenusMars className="text-[10px]" />}>
                    <select
                      aria-label={t("profile.gender")}
                      className={`${profileControlClass} appearance-none bg-[linear-gradient(45deg,transparent_50%,#94a3b8_50%),linear-gradient(135deg,#94a3b8_50%,transparent_50%)] bg-[position:calc(100%-18px)_21px,calc(100%-13px)_21px] bg-[size:5px_5px,5px_5px] bg-no-repeat pr-10`}
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">—</option>
                      <option value="Male">{t("profile.genderMale")}</option>
                      <option value="Female">{t("profile.genderFemale")}</option>
                      <option value="Other">{t("profile.genderOther")}</option>
                    </select>
                  </ProfileFormField>
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:col-span-2 md:gap-4">
                    <ProfileFormField label={t("profile.state")} icon={<FaMapMarkerAlt className="text-[10px]" />}>
                      <input aria-label={t("profile.state")} className={profileControlClass} value={formData.currentState} onChange={(e) => setFormData({ ...formData, currentState: e.target.value })} />
                    </ProfileFormField>
                    <ProfileFormField label={t("profile.city")} icon={<FaMapMarkerAlt className="text-[10px]" />}>
                      <input aria-label={t("profile.city")} className={profileControlClass} value={formData.currentCity} onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })} />
                    </ProfileFormField>
                  </div>
                </div>
              </section>

              <section className="mobile-app-card rounded-[24px] border border-white/90 bg-white/[0.72] p-3.5 shadow-[0_14px_40px_rgba(46,109,212,0.07)] backdrop-blur-xl md:p-4 xl:p-5">
                <div className="mb-3 flex items-center gap-2.5 md:mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-sm text-emerald-600"><FaNotesMedical /></span>
                  <div className="min-w-0"><h3 className="break-words text-sm font-black leading-5 text-slate-900 md:text-base">{t("profile.medicalInfo")}</h3><p className="break-words text-[9px] font-medium leading-4 text-slate-400 md:text-[10px]">{t("profile.medicalBlurb")}</p></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                  <ProfileFormField label={t("profile.allergies")} icon={<FaAllergies className="text-[10px] text-amber-500" />}>
                    <input aria-label={t("profile.allergies")} className={profileControlClass} value={formData.allergies} placeholder={t("profile.allergiesPlaceholder")} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} />
                  </ProfileFormField>
                  <ProfileFormField label={t("profile.medications")} icon={<FaCapsules className="text-[10px] text-emerald-500" />}>
                    <input aria-label={t("profile.medications")} className={profileControlClass} value={formData.regularMedications} placeholder={t("profile.medicationsPlaceholder")} onChange={(e) => setFormData({ ...formData, regularMedications: e.target.value })} />
                  </ProfileFormField>
                  <ProfileFormField className="sm:col-span-2" label={t("profile.conditions")} icon={<FaHeartbeat className="text-[10px] text-rose-500" />}>
                    <input aria-label={t("profile.conditions")} className={profileControlClass} value={formData.medicalConditions} placeholder={t("profile.conditionsPlaceholder")} onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })} />
                  </ProfileFormField>
                </div>
              </section>

              <div>
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-3 p-3 rounded-xl bg-success/10 border border-success/20 text-success text-center text-xs font-bold flex justify-center items-center gap-2"
                    >
                      <FaSave className="text-lg" />
                      {t("profile.saved")}
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button
                  color="primary"
                  size="lg"
                  className="w-full h-12 md:h-14 rounded-2xl text-sm md:text-base font-black shadow-xl shadow-primary/20"
                  startContent={!saving && <FaSave className="opacity-60 text-sm" />}
                  isLoading={saving}
                  onPress={handleSave}
                >
                  {saving ? t("profile.saving") : t("profile.save")}
                </Button>
                <Button
                  color="danger"
                  variant="flat"
                  size="lg"
                  className="mt-3 h-12 w-full rounded-2xl text-sm font-black md:h-14 md:text-base"
                  startContent={!loggingOut && <FaSignOutAlt className="text-sm" />}
                  isLoading={loggingOut}
                  onPress={handleLogout}
                >
                  {t("nav.signOut")}
                </Button>
              </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
