/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { Button } from "@/components/ui/Button";
import { Avatar, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Skeleton } from "@heroui/react";
import { auth } from "@/lib/firebase-auth";
import { db } from "@/lib/firebase-db";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getConsultationStatus, type Consultation } from "@/types/consultation";
import { clearNativeSession } from "@/lib/native-session";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaStethoscope,
  FaUser,
  FaSignOutAlt,
  FaCalendarCheck,
  FaSearch,
  FaVideo,
  FaHeartbeat,
  FaShieldAlt,
  FaChevronRight,
  FaRegBell,
  FaPrescriptionBottleAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { playSound } from "@/utils/sound";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useTranslation } from "@/i18n/LanguageProvider";
import Image from "next/image";
import { getSpecialityImage } from "@/utils/speciality-images";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
import { fetchSpecialities, getCachedSpecialities, type Speciality } from "@/lib/specialities";
import { clearCachedBookings } from "@/lib/bookings-cache";
import { formatDisplayDate, formatDisplayTime } from "@/utils/timezone";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AIResponse {
  message: string;
  suggestedSpecialities: string[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export default function Home() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // The server cannot read sessionStorage, so the hydration render must always
  // start from the same empty/loading state. The effect below applies the cache
  // immediately after hydration without causing an HTML mismatch.
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [navigatingSpeciality, setNavigatingSpeciality] = useState<string | null>(null);
  const [showAllSpecialities, setShowAllSpecialities] = useState(false);
  const [liveConsultation, setLiveConsultation] = useState<Consultation | null>(null);
  const [nextConsultation, setNextConsultation] = useState<Consultation | null>(null);
  /* Commented out AI Assistant state
  const [symptoms, setSymptoms] = useState("");
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      type: "bot" | "user";
      content: string;
    }>
  >([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  */

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  // A live consultation must surface here the moment it starts, not just on
  // the bookings page the patient has to think to open — onSnapshot instead
  // of a one-off read so it appears/disappears in real time as the window
  // opens and closes, without needing a page reload.
  useEffect(() => {
    if (!isLoggedIn) {
      setLiveConsultation(null);
      setNextConsultation(null);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "Consultations"),
      where("participants", "array-contains", uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map((d) => ({ ...(d.data() as Consultation), consultationId: d.id }));
      setLiveConsultation(all.find((c) => getConsultationStatus(c) === "active") ?? null);
      // The hero card's "book a consultation" prompt only makes sense when
      // there's nothing already booked — once there is, showing it anyway
      // hides the one thing the patient actually needs to see there.
      const upcoming = all
        .filter((c) => getConsultationStatus(c) === "upcoming")
        .sort((a, b) => a.consultationTime - b.consultationTime);
      setNextConsultation(upcoming[0] ?? null);
    });
    return () => unsubscribe();
  }, [isLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedSpecialities();
    if (cached) {
      setSpecialities(cached);
      setLoading(false);
    }

    fetchSpecialities()
      .then((data) => {
        if (!cancelled) setSpecialities(data);
      })
      .catch((error) => console.error("Error fetching specialities:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every primary action on this page — the hero CTA, the search bar, the quick
  // actions and each speciality card — lands on /doctors, so warming that one
  // chunk covers all of them. The bottom nav prefetches it on mobile; this is
  // what makes the desktop header and hero buttons instant too.
  useEffect(() => {
    router.prefetch("/doctors");
  }, [router]);

  /* Commented out AI Assistant effects
  useEffect(() => {
    // Show chat after 10 seconds
    const timer = setTimeout(() => {
      if (!isChatOpen) {
        setIsChatOpen(true);
        setMessages([
          {
            type: "bot",
            content:
              "Hi! I noticed you're looking through our specialities. Need help finding the right specialist?",
          },
        ]);
        playSound("notification");
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll to bottom of chat when new message is added
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  */

  const handleLogout = async () => {
    try {
      clearNativeSession();
      clearCachedBookings(auth.currentUser?.uid);
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  /* Commented out AI Assistant logic
  const handleAIConsultation = async () => {
    if (!symptoms.trim()) return;

    setMessages((prev) => [...prev, { type: "user", content: symptoms }]);
    setSymptoms("");
    setAnalyzing(true);

    try {
      const response = await generateGeminiResponse(symptoms);

      setMessages((prev) => [
        ...prev,
        { type: "bot", content: response.message },
      ]);

      setAiResponse({
        message: response.message,
        suggestedSpecialities: response.suggestedSpecialities,
      });

      playSound("message");
    } catch (error) {
      console.error("Error getting AI response:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content:
            "I apologize, but I'm having trouble analyzing your symptoms right now. Please try again or consult with a General Physician.",
        },
      ]);
      setAiResponse({
        message: "Error analyzing symptoms",
        suggestedSpecialities: ["General Physician (M.B.B.S)"],
      });
      playSound("message");
    } finally {
      setAnalyzing(false);
    }
  };
  */

  return (
    <div className="mobile-app-shell min-h-[100dvh] flex flex-col bg-[#F8FAFC]">

      {/* ── Mobile Top Bar ─────────────────────────────────────────── */}
      <header
        className="md:hidden sticky top-0 z-40 bg-[#F5F7FB]/90 backdrop-blur-2xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between px-5 h-16">
          <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
            <Logo size="sm" className="rounded-[10px] shadow-md shadow-primary/10" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{t("brand.welcome")}</p>
              <span className="block truncate text-base font-extrabold tracking-tight text-slate-900">
                {isLoggedIn ? t("home.greeting", { name: auth.currentUser?.displayName?.split(" ")[0] || t("home.greetingFallback") }) : t("home.tagline")}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2" aria-label={t("nav.quickSettings")}>
            <LanguageSwitcher />
            <button
              type="button"
              aria-label={t("nav.notifications", { count: 3 })}
              className="mobile-pressable relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900 shadow-sm transition-colors hover:bg-slate-200"
            >
              <FaRegBell className="text-lg" aria-hidden="true" />
              <span className="absolute -right-0.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#F5F7FB] bg-red-500 px-1 text-[10px] font-black leading-none text-white">
                3
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Desktop Navbar ─────────────────────────────────────────── */}
      <header className="hidden md:block sticky top-0 z-40 w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center rounded-[22px] bg-white/[0.78] backdrop-blur-2xl px-5 py-2.5 border border-white/90 shadow-[0_12px_36px_rgba(46,109,212,0.09)]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <Logo size="md" className="shadow-md shadow-primary/15 rounded-xl" />
            <div><h1 className="text-xl font-black leading-none tracking-tight text-slate-900">Soocher</h1><p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-primary">{t("brand.tagline")}</p></div>
          </div>
          <div className="flex items-center gap-7">
            <button onClick={() => document.getElementById("specialities")?.scrollIntoView({ behavior: "smooth" })} className="hidden lg:block text-xs font-bold text-slate-500 transition-colors hover:text-primary">{t("nav.specialities")}</button>
            <button onClick={() => router.push("/doctors")} className="hidden lg:block text-xs font-bold text-slate-500 transition-colors hover:text-primary">{t("nav.findDoctors")}</button>
            <button onClick={() => router.push("/contact")} className="hidden lg:block text-xs font-bold text-slate-500 transition-colors hover:text-primary">{t("nav.contact")}</button>
            <LanguageSwitcher />
            {isLoggedIn ? (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Avatar isBordered as="button" className="transition-transform ring-offset-2 ring-primary hover:scale-105" color="primary" name={auth.currentUser?.displayName || "User"} size="sm" src={auth.currentUser?.photoURL || undefined} />
                </DropdownTrigger>
                <DropdownMenu aria-label={t("nav.profileActions")} variant="flat" className="p-2">
                  <DropdownItem key="profile" className="h-14 gap-2 opacity-100 cursor-default">
                    <p className="text-xs text-slate-500">{t("nav.signedInAs")}</p>
                    <p className="font-semibold text-slate-900">{auth.currentUser?.phoneNumber || auth.currentUser?.email}</p>
                  </DropdownItem>
                  <DropdownItem key="my_profile" startContent={<FaUser className="text-primary opacity-70" />} onPress={() => router.push("/profile")} className="rounded-lg">{t("nav.myProfile")}</DropdownItem>
                  <DropdownItem key="bookings" startContent={<FaCalendarCheck className="text-primary opacity-70" />} onPress={() => router.push("/bookings")} className="rounded-lg">{t("nav.myBookings")}</DropdownItem>
                  <DropdownItem key="prescriptions" startContent={<FaPrescriptionBottleAlt className="text-primary opacity-70" />} onPress={() => router.push("/prescriptions")} className="rounded-lg">Prescriptions</DropdownItem>
                  <DropdownItem key="logout" className="text-danger rounded-lg" color="danger" startContent={<FaSignOutAlt />} onPress={handleLogout}>{t("nav.signOut")}</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            ) : (
              <Button color="primary" onClick={() => router.push("/login")} size="md" className="rounded-xl h-10 font-bold shadow-lg shadow-primary/20 px-6">{t("nav.signIn")}</Button>
            )}
          </div>
        </nav>
      </header>

      {/* ── Live consultation banner — same on every breakpoint, unlike the
          hero below which has separate mobile/desktop variants. ───────── */}
      {liveConsultation && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-2 md:mx-auto md:max-w-5xl md:px-6 md:pt-4"
        >
          <button
            onClick={() => router.push(`/video-call/${liveConsultation.consultationId}`)}
            className="mobile-pressable flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 text-left shadow-lg shadow-emerald-500/25 md:px-5 md:py-4"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 md:h-11 md:w-11">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
              <FaVideo className="relative text-base text-white md:text-lg" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-50">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live now
              </span>
              <span className="mt-0.5 block truncate text-sm font-extrabold text-white md:text-base">
                Consultation with {liveConsultation.doctorName} is in progress
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-700 md:text-sm">
              Join
            </span>
          </button>
        </motion.div>
      )}

      {/* ── Mobile Hero ─────────────────────────────────────────────── */}
      <section className="md:hidden px-4 pt-2 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mobile-glass-panel relative overflow-hidden rounded-[28px] px-5 py-6 shadow-[0_22px_50px_rgba(46,109,212,0.12)]"
        >
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="absolute right-5 bottom-5 h-20 w-20 rounded-full border border-primary/10" />
          {nextConsultation ? (
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                <FaCalendarCheck className="text-[10px]" /> Upcoming consultation
              </span>
              <h1 className="mt-2.5 break-words text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-slate-900">
                {nextConsultation.doctorName}
              </h1>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                {formatDisplayDate(nextConsultation.consultationTime, nextConsultation.timezone)} · {formatDisplayTime(nextConsultation.consultationTime, nextConsultation.timezone)}
              </p>
            </div>
          ) : (
            <div className={`relative z-10 ${lang === "ml" ? "w-full pr-1" : "max-w-[78%]"}`}>
              <h1 className={`break-words font-black text-slate-900 ${
                lang === "ml"
                  ? "text-[26px] leading-[1.22] tracking-normal"
                  : "text-[28px] leading-[1.08] tracking-[-0.035em]"
              }`}>{t("home.heroTitleMobile")}<br />{t("home.heroTitleMobile2")}</h1>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">{t("home.heroSubtitleMobile")}</p>
            </div>
          )}
          <button onClick={() => router.push(nextConsultation ? "/bookings" : "/doctors")} className="mobile-pressable relative z-10 mt-5 flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-lg shadow-primary/10 backdrop-blur-xl">
            <span className="min-w-0 flex-1 break-words text-left leading-5">{nextConsultation ? "View booking details" : t("home.bookConsultation")}</span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white"><FaChevronRight className="text-[10px]" /></span>
          </button>
        </motion.div>

        <button onClick={() => router.push("/doctors")} className="mobile-pressable mt-4 flex h-13 w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-sm">
          <FaSearch className="text-primary" />
          <span className="flex-1 text-sm font-semibold text-slate-400">{t("home.searchPlaceholder")}</span>
          <FaChevronRight className="text-[10px] text-slate-300" />
        </button>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {[
            { label: t("home.videoConsult"), icon: FaVideo, href: "/doctors", tone: "bg-blue-50 text-primary" },
            { label: t("home.myBookings"), icon: FaCalendarCheck, href: "/bookings", tone: "bg-emerald-50 text-emerald-600" },
            { label: "Prescriptions", icon: FaPrescriptionBottleAlt, href: "/prescriptions", tone: "bg-amber-50 text-amber-600" },
            { label: t("home.myProfile"), icon: FaHeartbeat, href: "/profile", tone: "bg-rose-50 text-rose-500" },
          ].map(({ label, icon: Icon, href, tone }) => (
            <button key={label} onClick={() => router.push(href)} className="mobile-pressable flex min-w-0 flex-col items-center gap-1.5 text-center">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon className="text-base" /></span>
              <span className="w-full truncate text-[9px] font-bold leading-tight text-slate-600">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Desktop Hero Section ─────────────────────────────────────── */}
      <section className="hidden md:block relative px-6 pb-16 pt-5 lg:pb-20 lg:pt-8 overflow-hidden">
        <div className="pointer-events-none absolute left-[-8rem] top-[-5rem] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[-5rem] bottom-[-8rem] h-96 w-96 rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="relative max-w-7xl mx-auto overflow-hidden rounded-[38px] border border-white/90 bg-white/55 p-7 lg:p-10 shadow-[0_30px_90px_rgba(46,109,212,0.12)] backdrop-blur-2xl">
          <div className="grid grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }} className="z-10 will-change-transform flex flex-col items-start text-left">
            {nextConsultation ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-primary">
                  <FaCalendarCheck className="text-xs" /> Upcoming consultation
                </span>
                <h1 className="mt-4 text-[38px] lg:text-[50px] font-black text-slate-900 leading-[1.06] tracking-[-0.04em]">
                  {nextConsultation.doctorName}
                </h1>
                <p className="mt-4 text-sm lg:text-base font-semibold text-slate-600 leading-relaxed max-w-lg">
                  {formatDisplayDate(nextConsultation.consultationTime, nextConsultation.timezone)} at {formatDisplayTime(nextConsultation.consultationTime, nextConsultation.timezone)}
                </p>
                <div className="mt-7 flex items-center gap-3">
                  <Button size="lg" color="primary" className="rounded-2xl px-7 font-black shadow-xl shadow-primary/20 h-12 text-sm" onClick={() => router.push("/bookings")}>
                    View booking details
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-[42px] lg:text-[58px] xl:text-[64px] font-black text-slate-900 leading-[1.04] tracking-[-0.045em]">
                  {t("home.heroTitle")}<br />
                  <span className="text-primary">{t("home.heroTitleAccent")}</span>
                </h1>
                <p className="mt-5 text-sm lg:text-base text-slate-600 leading-relaxed max-w-lg">
                  {t("home.heroSubtitle")}
                </p>
                <div className="mt-7 flex items-center gap-3">
                  <Button size="lg" color="primary" className="rounded-2xl px-7 font-black shadow-xl shadow-primary/20 h-12 text-sm" onClick={() => router.push("/doctors")}>
                    {t("home.bookConsultation")}
                  </Button>
                </div>
              </>
            )}
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><FaShieldAlt className="text-emerald-500" /> {t("home.verifiedSpecialists")}</span>
              <span className="flex items-center gap-1.5"><FaVideo className="text-primary" /> {t("home.secureVideoCare")}</span>
              <span className="flex items-center gap-1.5"><FaCalendarCheck className="text-violet-500" /> {t("home.easyScheduling")}</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.65 }} className="relative min-h-[390px] lg:min-h-[455px] will-change-transform">
            <div className="absolute inset-0 overflow-hidden rounded-[30px] border-[6px] border-white shadow-[0_24px_60px_rgba(46,109,212,0.16)]">
              <Image src="/specialities/general-physician.jpg" alt="Verified Soocher doctor" fill priority sizes="(max-width: 1024px) 52vw, 600px" className="object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900/45 to-transparent" />
            </div>
            <div className="absolute -left-5 bottom-6 flex items-center gap-3 rounded-2xl border border-white/90 bg-white/[0.88] p-3 shadow-xl backdrop-blur-xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FaShieldAlt /></span>
              <div><p className="text-xs font-black text-slate-900">{t("home.hundredVerified")}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-500">{t("home.trustedProfessionals")}</p></div>
            </div>
            <div className="absolute -right-4 top-6 rounded-2xl border border-white/90 bg-white/[0.88] px-4 py-3 shadow-xl backdrop-blur-xl">
              <p className="text-xl font-black text-primary">29</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t("home.specialitiesCount")}</p>
            </div>
            <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 shadow-lg backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-[9px] font-extrabold text-slate-700">{t("home.consultOnline")}</span>
            </div>
          </motion.div>
          </div>

          <div className="mt-8 grid grid-cols-3 divide-x divide-slate-100 overflow-hidden rounded-2xl border border-white/90 bg-white/[0.62] shadow-sm">
            {[
              { icon: FaSearch, title: t("home.stepFind"), text: t("home.stepFindBlurb") },
              { icon: FaCalendarCheck, title: t("home.stepTime"), text: t("home.stepTimeBlurb") },
              { icon: FaVideo, title: t("home.stepConsult"), text: t("home.stepConsultBlurb") },
            ].map(({ icon: Icon, title, text }) => (
              <button key={title} onClick={() => router.push("/doctors")} className="group flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105"><Icon /></span>
                <span><span className="block text-xs font-black text-slate-800">{title}</span><span className="mt-0.5 block text-[9px] font-semibold text-slate-400">{text}</span></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Specialities Section ─────────────────────────────────────── */}
      <main
        id="specialities"
        className="hidden md:block flex-1 px-4 md:px-6 bg-white/[0.82] rounded-t-[32px] md:rounded-t-[48px] shadow-[0_-20px_60px_-10px_rgba(46,109,212,0.06)] border-t border-white pb-safe-nav md:pb-24 pt-6 md:pt-16"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-10 gap-3 md:gap-6">
            <div className="space-y-1 md:space-y-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">{t("home.exploreCare")}</p>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{t("home.findBySpeciality")}</h2>
              <p className="text-sm md:text-base text-slate-500 max-w-xl">
                {t("home.findBySpecialityBlurb")}
              </p>
            </div>
            <Button onClick={() => router.push("/doctors")} variant="flat" color="primary" className="rounded-xl px-5 font-bold">{t("home.viewAllDoctors")} <FaChevronRight className="ml-1 text-[9px]" /></Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {loading ? (
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="desktop-speciality-card premium-card h-[104px] flex items-center gap-3 p-3">
                  <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-full rounded-lg" /><Skeleton className="h-3 w-16 rounded-lg" /></div>
                </div>
              ))
            ) : (
              specialities.map((speciality, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.4, delay: index * 0.04 }}
                  className="desktop-speciality-card group premium-card flex min-h-[104px] items-center gap-3 p-3 text-left cursor-pointer active:scale-95 transition-transform duration-150"
                  style={{ borderRadius: "20px", WebkitTapHighlightColor: "transparent" }}
                  onClick={() => {
                    setNavigatingSpeciality(speciality.name);
                    router.push(`/doctors?speciality=${encodeURIComponent(speciality.name)}`);
                  }}
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-primary/5 ring-1 ring-white shadow-sm">
                    {getSpecialityImage(speciality.name) ? (
                      <Image
                        src={getSpecialityImage(speciality.name)!}
                        alt={`${speciality.name} specialist`}
                        fill
                        sizes="80px"
                        className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-primary"><FaStethoscope className="text-lg md:text-2xl" /></span>
                    )}
                    {navigatingSpeciality === speciality.name && (
                      <span className="absolute inset-0 flex items-center justify-center bg-white/65 text-primary backdrop-blur-sm"><ButtonSpinner size="sm" label={`Opening ${speciality.name}`} /></span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-3 text-sm font-extrabold leading-snug text-slate-800">{speciality.name}</h3>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t("home.available.short")}</p>
                  </div>
                </motion.div>
              ))
            )}
            {!loading && specialities.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-slate-400 font-medium italic">{t("home.noSpecialities")}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <main id="mobile-specialities" className="md:hidden flex-1 px-4 pt-2 pb-safe-nav">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">{t("home.exploreCare")}</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">{t("nav.specialities")}</h2>
          </div>
          {specialities.length > 8 && (
            <button onClick={() => setShowAllSpecialities((shown) => !shown)} className="mobile-pressable flex items-center gap-1 text-xs font-bold text-primary">
              {showAllSpecialities ? t("home.showLess") : t("home.viewAll")}
              <FaChevronRight className={`text-[9px] transition-transform ${showAllSpecialities ? "-rotate-90" : "rotate-90"}`} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {loading ? [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="mobile-speciality-card mobile-app-card app-shimmer h-[84px]" />
          )) : specialities.slice(0, showAllSpecialities ? specialities.length : 8).map((speciality, index) => (
            <button
              key={speciality.name}
              onClick={() => {
                setNavigatingSpeciality(speciality.name);
                router.push(`/doctors?speciality=${encodeURIComponent(speciality.name)}`);
              }}
              className="mobile-speciality-card mobile-pressable mobile-app-card group flex min-h-[84px] items-center gap-2.5 overflow-hidden p-2.5 text-left"
            >
              <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[16px] bg-primary/5 ring-1 ring-white shadow-sm min-[360px]:h-16 min-[360px]:w-16">
                {getSpecialityImage(speciality.name) ? (
                  <Image
                    src={getSpecialityImage(speciality.name)!}
                    alt={`${speciality.name} specialist`}
                    fill
                    sizes="64px"
                    className="object-cover object-top"
                  />
                ) : (
                  <span className={`absolute inset-0 flex items-center justify-center ${index % 3 === 0 ? "bg-blue-50 text-primary" : index % 3 === 1 ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"}`}><FaStethoscope className="text-sm" /></span>
                )}
                {navigatingSpeciality === speciality.name && <span className="absolute inset-0 flex items-center justify-center bg-white/65 text-primary backdrop-blur-sm"><ButtonSpinner size="sm" label={`Opening ${speciality.name}`} /></span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-3 break-words [overflow-wrap:anywhere] text-[10px] font-extrabold leading-snug text-slate-800 min-[360px]:text-[11px]">{speciality.name}</span>
                <span className="mt-1.5 flex min-w-0 items-center gap-1 text-[8px] font-semibold text-slate-400 min-[360px]:text-[9px]"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" /><span className="min-w-0 truncate">{t("home.available.short")}</span></span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm"><FaShieldAlt /></span>
          <div>
            <p className="text-xs font-extrabold text-slate-800">{t("home.privateTitle")}</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{t("home.privateBlurb")}</p>
          </div>
        </div>
      </main>

      {/* Commented out AI Assistant Chat
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="fixed bottom-6 right-6 w-96 z-[200]"
          >
            <Card className="shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border-none overflow-hidden rounded-[32px]">
              <CardBody className="p-0 flex flex-col">
                <div className="bg-primary p-6 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <FaRobot className="text-2xl" />
                    </div>
                    <div>
                      <h3 className="font-bold">Soocher Advisor</h3>
                      <p className="text-xs opacity-80 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online
                      </p>
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="text-white hover:bg-white/20 transition-colors"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <span className="text-xl">×</span>
                  </Button>
                </div>

                <div className="h-[400px] overflow-y-auto p-6 bg-slate-50 space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded-[20px] shadow-sm ${message.type === "user"
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                          }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        {message.type === "bot" && aiResponse?.suggestedSpecialities && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {aiResponse.suggestedSpecialities.map((speciality, idx) => (
                              <Button
                                key={idx}
                                size="sm"
                                color="primary"
                                variant="flat"
                                className="bg-primary/5 text-primary font-bold hover:bg-primary/10 border-none"
                                onClick={() => {
                                  router.push(`/${encodeURIComponent(speciality)}`);
                                  setIsChatOpen(false);
                                }}
                              >
                                {speciality}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {analyzing && (
                    <div className="flex justify-start">
                      <div className="bg-white p-4 rounded-[20px] rounded-tl-none border border-slate-100 shadow-sm animate-pulse">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75" />
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-6 bg-white border-t border-slate-100">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAIConsultation();
                    }}
                    className="flex gap-3"
                  >
                    <div className="flex-1 relative">
                      <Textarea
                        placeholder="Describe your symptoms..."
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        minRows={1}
                        maxRows={4}
                        className="bg-slate-50 rounded-2xl"
                        classNames={{
                          input: "placeholder:text-slate-400"
                        }}
                      />
                    </div>
                    <Button
                      isIconOnly
                      color="primary"
                      type="submit"
                      isDisabled={!symptoms.trim() || analyzing}
                      className="rounded-2xl h-12 w-12 shadow-lg shadow-primary/20 shrink-0"
                    >
                      <FaRobot />
                    </Button>
                  </form>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!isChatOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 z-[150] w-16 h-16 bg-primary rounded-full shadow-[0_20px_50px_rgba(46,109,212,0.4)] flex items-center justify-center text-white border-2 border-white/20 group"
        >
          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:opacity-40 transition-opacity" />
          <FaRobot className="text-2xl relative z-10" />
        </motion.button>
      )}
      */}
      <Footer />
    </div>
  );
}
