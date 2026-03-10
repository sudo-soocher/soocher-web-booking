"use client";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Textarea,
  Modal,
  ModalContent,
  ModalBody,
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@nextui-org/react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  FaStethoscope,
  FaRobot,
  FaUser,
  FaSignOutAlt,
  FaCalendarCheck,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/utils/sound";
import { generateGeminiResponse } from "@/services/gemini";

interface Speciality {
  name: string;
  description: string;
}

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
  const [loading, setLoading] = useState(true);
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full p-4 bg-white shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">Soocher</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="light"
              size="sm"
              onPress={() => router.push("/contact")}
            >
              Contact Us
            </Button>
            {isLoggedIn ? (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Avatar
                    isBordered
                    as="button"
                    className="transition-transform"
                    color="primary"
                    name={auth.currentUser?.displayName || "User"}
                    size="sm"
                    src={auth.currentUser?.photoURL || undefined}
                  />
                </DropdownTrigger>
                <DropdownMenu aria-label="Profile Actions" variant="flat">
                  <DropdownItem
                    key="profile"
                    className="h-14 gap-2"
                    textValue="Profile Header"
                  >
                    <p className="font-semibold">Signed in as</p>
                    <p className="font-semibold">
                      {auth.currentUser?.phoneNumber || auth.currentUser?.email}
                    </p>
                  </DropdownItem>
                  <DropdownItem
                    key="my_profile"
                    startContent={<FaUser className="text-primary" />}
                    onPress={() => router.push("/profile")}
                  >
                    My Profile
                  </DropdownItem>
                  <DropdownItem
                    key="bookings"
                    startContent={<FaCalendarCheck className="text-primary" />}
                    onPress={() => router.push("/bookings")}
                  >
                    My Bookings
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    className="text-danger"
                    color="danger"
                    startContent={<FaSignOutAlt className="text-danger" />}
                    onPress={handleLogout}
                  >
                    Sign Out
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            ) : (
              <Button
                color="primary"
                onClick={() => router.push("/login")}
                size="sm"
                startContent={<FaUser />}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative bg-primary/10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="p-4 bg-primary/20 rounded-full"
              >
                <FaStethoscope className="text-4xl text-primary" />
              </motion.div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Find Your Perfect Healthcare Match
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with verified specialists for personalized care and expert
              consultations
            </p>
          </motion.div>
        </div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-96 h-96 bg-primary/5 rounded-full"></div>
          <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-primary/5 rounded-full"></div>
        </div>
      </div>

      {/* Specialities Section */}
      <main className="flex-1 bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Our Specialities
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Choose from our wide range of medical specialities
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap justify-center gap-2"
          >
            {specialities.map((speciality, index) => (
              <motion.div key={index} variants={itemVariants} className="flex">
                <Chip
                  variant="shadow"
                  classNames={{
                    base: "bg-gradient-to-br from-primary-100 to-primary-200 hover:from-primary-200 hover:to-primary-300 transition-all cursor-pointer py-6 px-6",
                    content: "text-primary-600 font-semibold text-base",
                  }}
                  onClick={() =>
                    router.push(`/${encodeURIComponent(speciality.name)}`)
                  }
                  startContent={<FaStethoscope className="text-primary-500" />}
                >
                  {speciality.name}
                </Chip>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Chat Interface */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 w-96 z-50"
          >
            <Card className="shadow-xl border-2 border-primary/20">
              <CardBody className="p-0">
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FaRobot className="text-xl text-primary" />
                    </div>
                    <h3 className="font-semibold">Soocher AI Assistant</h3>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={() => setIsChatOpen(false)}
                  >
                    ×
                  </Button>
                </div>

                {/* Chat Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                        }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${message.type === "user"
                            ? "bg-primary text-white"
                            : "bg-gray-100"
                          }`}
                      >
                        <p className="whitespace-pre-line text-sm">
                          {message.content}
                        </p>
                        {message.type === "bot" &&
                          aiResponse?.suggestedSpecialities && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {aiResponse.suggestedSpecialities.map(
                                (speciality, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                  >
                                    <Button
                                      size="sm"
                                      color="primary"
                                      variant="flat"
                                      onPress={() => {
                                        router.push(
                                          `/${encodeURIComponent(speciality)}`
                                        );
                                        setIsChatOpen(false);
                                      }}
                                      className="text-xs"
                                      startContent={
                                        <FaStethoscope className="text-xs" />
                                      }
                                    >
                                      {speciality}
                                    </Button>
                                  </motion.div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </motion.div>
                  ))}
                  {analyzing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <p className="text-sm">Analyzing your symptoms...</p>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAIConsultation();
                    }}
                    className="flex gap-2"
                  >
                    <Textarea
                      placeholder="Describe your symptoms..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      minRows={1}
                      maxRows={4}
                      className="flex-1"
                    />
                    <Button
                      isIconOnly
                      color="primary"
                      type="submit"
                      isDisabled={!symptoms.trim() || analyzing}
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

      {/* Chat Toggle Button with enhanced animations */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 20,
              },
            }}
            exit={{
              opacity: 0,
              scale: 0,
              y: 20,
              transition: {
                duration: 0.2,
              },
            }}
            whileHover={{
              scale: 1.1,
              rotate: [0, -10, 10, -10, 0],
              transition: {
                duration: 0.5,
              },
            }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Button
              isIconOnly
              color="primary"
              size="lg"
              className="rounded-full shadow-lg"
              onClick={() => setIsChatOpen(true)}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <FaRobot className="text-xl" />
              </motion.div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
