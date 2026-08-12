/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { Button } from "@/components/ui/Button";
import { Chip, Avatar, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Skeleton, Spinner } from "@nextui-org/react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  FaStethoscope,
  FaUser,
  FaSignOutAlt,
  FaCalendarCheck,
} from "react-icons/fa";
import { motion } from "framer-motion";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { playSound } from "@/utils/sound";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { generateGeminiResponse } from "@/services/gemini";
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/ui/Logo";

interface Speciality {
  name: string;
  description: string;
}

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [navigatingSpeciality, setNavigatingSpeciality] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchSpecialities = async () => {
      try {
        const docRef = doc(db, "Specialities", "available");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSpecialities(data.specialityName || []);
        }
      } catch (error) {
        console.error("Error fetching specialities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialities();
  }, []);

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
    <div className="min-h-[100dvh] flex flex-col bg-[#F8FAFC]">

      {/* ── Mobile Top Bar ─────────────────────────────────────────── */}
      <header
        className="md:hidden sticky top-0 z-40 bg-white/85 backdrop-blur-2xl border-b border-slate-100/60"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Logo size="sm" className="rounded-xl shadow-md shadow-primary/10" />
            <span className="text-lg font-bold tracking-tight text-slate-900">Soocher</span>
          </div>
          {isLoggedIn && (
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Avatar
                  isBordered
                  as="button"
                  className="transition-transform ring-offset-2 ring-primary"
                  color="primary"
                  name={auth.currentUser?.displayName || "User"}
                  size="sm"
                  src={auth.currentUser?.photoURL || undefined}
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="Profile Actions" variant="flat" className="p-2">
                <DropdownItem key="profile" className="h-14 gap-2 opacity-100 cursor-default">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="font-semibold text-slate-900">
                    {auth.currentUser?.phoneNumber || auth.currentUser?.email}
                  </p>
                </DropdownItem>
                <DropdownItem key="my_profile" startContent={<FaUser className="text-primary opacity-70" />} onPress={() => router.push("/profile")} className="rounded-lg">My Profile</DropdownItem>
                <DropdownItem key="bookings" startContent={<FaCalendarCheck className="text-primary opacity-70" />} onPress={() => router.push("/bookings")} className="rounded-lg">My Bookings</DropdownItem>
                <DropdownItem key="logout" className="text-danger rounded-lg" color="danger" startContent={<FaSignOutAlt />} onPress={handleLogout}>Sign Out</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </header>

      {/* ── Desktop Navbar ─────────────────────────────────────────── */}
      <header className="hidden md:block sticky top-0 z-40 w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-[0_8px_32px_0_rgba(46,109,212,0.1)]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <Logo size="md" className="shadow-lg shadow-primary/20 rounded-xl" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Soocher</h1>
          </div>
          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Avatar isBordered as="button" className="transition-transform ring-offset-2 ring-primary hover:scale-105" color="primary" name={auth.currentUser?.displayName || "User"} size="sm" src={auth.currentUser?.photoURL || undefined} />
                </DropdownTrigger>
                <DropdownMenu aria-label="Profile Actions" variant="flat" className="p-2">
                  <DropdownItem key="profile" className="h-14 gap-2 opacity-100 cursor-default">
                    <p className="text-xs text-slate-500">Signed in as</p>
                    <p className="font-semibold text-slate-900">{auth.currentUser?.phoneNumber || auth.currentUser?.email}</p>
                  </DropdownItem>
                  <DropdownItem key="my_profile" startContent={<FaUser className="text-primary opacity-70" />} onPress={() => router.push("/profile")} className="rounded-lg">My Profile</DropdownItem>
                  <DropdownItem key="bookings" startContent={<FaCalendarCheck className="text-primary opacity-70" />} onPress={() => router.push("/bookings")} className="rounded-lg">My Bookings</DropdownItem>
                  <DropdownItem key="logout" className="text-danger rounded-lg" color="danger" startContent={<FaSignOutAlt />} onPress={handleLogout}>Sign Out</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            ) : (
              <Button color="primary" onClick={() => router.push("/login")} size="md" className="rounded-full font-semibold shadow-xl shadow-primary/20 px-8">Sign In</Button>
            )}
          </div>
        </nav>
      </header>

      {/* ── Mobile Hero ─────────────────────────────────────────────── */}
      <section className="md:hidden px-4 pt-5 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <Chip variant="flat" color="primary" className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary border-none">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Next Generation Healthcare
            </span>
          </Chip>
          <h1 className="text-3xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
            Expert Care,<br />
            <span className="text-primary">Just a Tap Away.</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Connect with top-tier specialists and manage your health journey with elegance.
          </p>
          <Button
            size="md"
            color="primary"
            className="rounded-full px-6 font-bold shadow-xl shadow-primary/25 h-11 w-full"
            onClick={() => {
              const element = document.getElementById("specialities");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Find Specialists
          </Button>
        </motion.div>
      </section>

      {/* ── Desktop Hero Section ─────────────────────────────────────── */}
      <section className="hidden md:block relative pt-12 pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-center lg:text-left">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="z-10 will-change-transform flex flex-col items-center lg:items-start">
            <Chip variant="flat" color="primary" className="mb-6 px-4 py-1 text-sm font-medium bg-primary/10 text-primary border-none">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Next Generation Healthcare
              </span>
            </Chip>
            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-8">
              Expert Care is <br />
              <span className="text-primary">Just a Click Away.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Experience healthcare redefined. Connect with top-tier specialists instantly and manage your health journey with absolute elegance.
            </p>
            <Button size="lg" color="primary" className="rounded-full px-8 font-bold shadow-2xl shadow-primary/25 h-14 text-lg" onClick={() => { const element = document.getElementById("specialities"); element?.scrollIntoView({ behavior: "smooth" }); }}>
              Find Specialists
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative will-change-transform">
            <div className="w-full aspect-square rounded-[48px] mesh-gradient opacity-20 absolute -rotate-6 top-0" />
            <div className="w-full aspect-square rounded-[48px] border-2 border-primary/10 relative z-10 p-8 glass-effect overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
              <div className="relative h-full flex flex-col justify-center items-center text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-4">
                  <Logo size="xl" className="w-full h-full rounded-2xl" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800">Verified Doctors</h2>
                <p className="text-slate-500 max-w-sm">Every specialist on Soocher is manually verified to ensure you receive the highest quality care.</p>
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Avatar key={i} isBordered size="md" className="ring-4 ring-white" src={`https://i.pravatar.cc/150?u=${i}`} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Specialities Section ─────────────────────────────────────── */}
      <main
        id="specialities"
        className="flex-1 px-4 md:px-6 bg-white rounded-t-[32px] md:rounded-t-[64px] shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.04)] border-t border-slate-100 pb-safe-nav md:pb-24 pt-6 md:pt-24"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-16 gap-3 md:gap-6">
            <div className="space-y-1 md:space-y-4">
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight">Our Specialities</h2>
              <p className="text-sm md:text-lg text-slate-500 max-w-xl">
                Select from our curated network of medical excellence.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {loading ? (
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="premium-card p-4 md:p-6 h-36 md:h-48 border-none ring-1 ring-slate-100 flex flex-col items-center gap-3 justify-center">
                  <Skeleton className="w-11 h-11 md:w-16 md:h-16 rounded-2xl" />
                  <Skeleton className="w-20 md:w-24 h-4 rounded-lg" />
                  <Skeleton className="w-14 md:w-16 h-3 rounded-lg" />
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
                  className="premium-card p-3 md:p-6 flex flex-col items-center text-center gap-2 md:gap-4 cursor-pointer active:scale-95 transition-transform duration-150 hover:border-primary/30"
                  style={{ borderRadius: "20px", WebkitTapHighlightColor: "transparent" }}
                  onClick={() => {
                    setNavigatingSpeciality(speciality.name);
                    router.push(`/doctors?speciality=${encodeURIComponent(speciality.name)}`);
                  }}
                >
                  <div className="w-11 h-11 md:w-16 md:h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                    {navigatingSpeciality === speciality.name ? (
                      <Spinner size="sm" color="primary" />
                    ) : (
                      <FaStethoscope className="text-lg md:text-2xl" />
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 break-words w-full text-xs md:text-base leading-tight">
                    {speciality.name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium">Available</p>
                </motion.div>
              ))
            )}
            {!loading && specialities.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-slate-400 font-medium italic">No specialities listed at the moment.</p>
              </div>
            )}
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
