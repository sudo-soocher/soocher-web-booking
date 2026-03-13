"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  Card,
  CardBody,
  Image,
  Avatar,
  Chip,
  Divider,
  Skeleton,
  Button,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@nextui-org/react";
import {
  FaStar,
  FaLanguage,
  FaMapMarkerAlt,
  FaHospital,
  FaUserMd,
  FaArrowLeft,
  FaClock,
} from "react-icons/fa";

import { initializeRazorpay } from "@/services/payment";
import { createNewConsultation } from "@/types/consultation";
import NewUserForm from "@/components/forms/NewUserForm";
import { calculateAge } from "@/types/patient";
import { Consultation } from "@/types/consultation";
import LoginForm from "@/components/forms/LoginForm";
import PatientForm from "@/components/forms/PatientForm";

interface Doctor {
  name: string;
  profileImage: string;
  aboutMe: string;
  worksAt: string;
  numExp: number;
  numOnline: number;
  numOffline: number;
  currentState: string;
  currentCity: string;
  consultationFees: number;
  averageRating: number;
  knownLanguages: string[];
  isAccountVerified: boolean;
  specialization: string;
  slotDuration?: number;
  timeSlots?: {
    [key: string]: {
      startTime: string;
      endTime: string;
      enabled: boolean;
    };
  };
}

interface DaySlots {
  availableSlots: {
    bookingDate: number; // epoch time
    time: string; // "08:00PM - 08:15PM"
  }[];
  isActive: boolean;
}

interface AvailableSlots {
  [key: string]: DaySlots;
}

// Add interface for slot type
interface Slot {
  bookingDate: number;
  time: string;
  isBooked?: boolean;
}

export default function DoctorDetails() {
  const params = useParams();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<AvailableSlots>({});
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [filteredSlots, setFilteredSlots] = useState<Slot[]>([]);

  // Function to get current day name
  const getCurrentDay = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDay = days[new Date().getDay()];
    return currentDay;
  };

  // Function to format day label
  const formatDayLabel = (dayKey: string) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const todayKey = days[today.getDay()];
    const tomorrowKey = days[(today.getDay() + 1) % 7];

    if (dayKey === todayKey) return "Today";
    if (dayKey === tomorrowKey) return "Tomorrow";

    // For other days, show the date
    const dayIndex = days.indexOf(dayKey);
    const currentDayIndex = today.getDay();
    const daysToAdd = (dayIndex - currentDayIndex + 7) % 7;
    const date = new Date(today);
    date.setDate(today.getDate() + daysToAdd);

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Function to calculate epoch timestamp from day name and time string
  const calculateSlotTimestamp = (dayKey: string, timeRange: string) => {
    try {
      const [startTime] = timeRange.split(" - "); // e.g., "09:00AM"
      const [time, period] = startTime.split(/(?=[AP]M)/); // ["09:00", "AM"]
      const [hours, minutes] = time.split(":").map(Number);

      const date = new Date();
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const currentDayIndex = date.getDay();
      const selectedDayIndex = days.indexOf(dayKey);

      // Calculate how many days to add to get to the correct day of the week
      const daysToAdd = (selectedDayIndex - currentDayIndex + 7) % 7;
      date.setDate(date.getDate() + daysToAdd);

      let hour = hours;
      if (period === "PM" && hours !== 12) hour += 12;
      if (period === "AM" && hours === 12) hour = 0;
      date.setHours(hour, minutes, 0, 0);

      return date.getTime();
    } catch (error) {
      console.error("Error calculating slot timestamp:", error);
      return 0;
    }
  };

  // Function to get available days
  const getAvailableDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const todayIndex = today.getDay();

    // Get next 4 consecutive days including today
    const availableDays = [];
    for (let i = 0; i < 4; i++) {
      const dayIndex = (todayIndex + i) % 7;
      const dayKey = days[dayIndex];
      availableDays.push(dayKey);
    }

    return availableDays;
  };

  const generateDynamicSlots = (dayKey: string) => {
    if (!doctor?.timeSlots || !doctor?.slotDuration) return [];

    const dayNameMap: { [key: string]: string } = {
      Sun: "sunday",
      Mon: "monday",
      Tue: "tuesday",
      Wed: "wednesday",
      Thu: "thursday",
      Fri: "friday",
      Sat: "saturday",
    };

    const daySchedule = doctor.timeSlots[dayNameMap[dayKey]];
    if (!daySchedule || !daySchedule.enabled) return [];

    const slots = [];
    const [startH, startM] = daySchedule.startTime.split(":").map(Number);
    const [endH, endM] = daySchedule.endTime.split(":").map(Number);

    const startTime = new Date();
    startTime.setHours(startH, startM, 0, 0);

    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);

    let current = new Date(startTime);
    while (current < endTime) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + doctor.slotDuration * 60000);

      const formatTime = (date: Date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}${ampm}`;
      };

      slots.push({
        time: `${formatTime(slotStart)} - ${formatTime(slotEnd)}`,
        bookingDate: 0, // Will be calculated by getFilteredSlots
      });

      current = new Date(slotEnd.getTime());
    }

    return slots;
  };

  useEffect(() => {
    const fetchDoctorAndSlots = async () => {
      try {
        // Fetch doctor details
        const docRef = doc(db, "Users", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setDoctor(docSnap.data() as Doctor);
        }

        // Fetch available slots
        const slotsRef = collection(
          db,
          "Users",
          params.id as string,
          "Available Slots"
        );
        const slotsSnap = await getDocs(slotsRef);

        const slotsData: AvailableSlots = {};
        slotsSnap.forEach((doc) => {
          slotsData[doc.id] = doc.data() as DaySlots;
        });

        setSlots(slotsData);

        // Set current day as selected if available, otherwise set first available day
        const currentDay = getCurrentDay();
        if (slotsData[currentDay]?.availableSlots?.length > 0) {
          setSelectedDay(currentDay);
        } else {
          // Find next available day within the next 4 days
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const currentDayIndex = days.indexOf(currentDay);

          let foundDay = false;
          // Check next 4 days starting from current day
          for (let i = 0; i < 4; i++) {
            const nextDayIndex = (currentDayIndex + i) % 7;
            const nextDay = days[nextDayIndex];
            if (slotsData[nextDay]?.availableSlots?.length > 0) {
              setSelectedDay(nextDay);
              foundDay = true;
              break;
            }
          }

          // If no slots in the next 4 days, just select current day
          if (!foundDay) {
            setSelectedDay(currentDay);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchDoctorAndSlots();
    }
  }, [params.id]);

  useEffect(() => {
    if (selectedDay) {
      getFilteredSlots(slots[selectedDay]?.availableSlots || []).then(
        setFilteredSlots
      );
    }
  }, [selectedDay, slots]);

  // Function to sort slots by time
  const sortSlots = (slots: { bookingDate: number; time: string }[]) => {
    return slots.sort((a, b) => a.bookingDate - b.bookingDate);
  };

  // Function to format epoch to readable date
  const formatDate = (epoch: number) => {
    const date = new Date(epoch);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Group slots by date
  const groupSlotsByDate = (slots: DaySlots["availableSlots"]) => {
    const groups: { [key: string]: typeof slots } = {};
    slots.forEach((slot) => {
      const dateKey = formatDate(slot.bookingDate);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
    });
    return groups;
  };

  // Function to filter and sort available slots
  const getFilteredSlots = async (slots: DaySlots["availableSlots"]) => {
    let slotsToProcess = slots || [];

    // Fallback if slots are empty but doctor has schedule
    if (slotsToProcess.length === 0 && doctor?.timeSlots) {
      slotsToProcess = generateDynamicSlots(selectedDay);
    }

    if (slotsToProcess.length === 0) return [];

    const now = new Date();
    const currentTime = now.getTime();

    // Map slots to include calculated timestamps if missing
    const slotsWithTimestamps = slotsToProcess.map((slot) => ({
      ...slot,
      calculatedTimestamp:
        slot.bookingDate && slot.bookingDate !== 0
          ? slot.bookingDate
          : calculateSlotTimestamp(selectedDay, slot.time),
    }));

    // Filter and check bookings for each slot
    const availableSlots = await Promise.all(
      slotsWithTimestamps
        .filter((slot) => {
          // For today, only filter if slot time is in the past
          if (selectedDay === getCurrentDay()) {
            // Add 10 minutes buffer to current time
            return slot.calculatedTimestamp > currentTime - 10 * 60 * 1000;
          }
          return true;
        })
        .map(async (slot) => {
          const isBooked = await isSlotBooked(slot.calculatedTimestamp);
          return { ...slot, isBooked };
        })
    );

    // Return only available slots sorted by time
    return availableSlots
      .filter((slot) => !slot.isBooked)
      .sort((a, b) => a.calculatedTimestamp - b.calculatedTimestamp);
  };

  // Function to check if a slot is booked
  const isSlotBooked = async (timestamp: number) => {
    try {
      // Query consultations collection for this doctor and time slot
      const consultationsRef = collection(db, "Consultations");
      const q = query(
        consultationsRef,
        where("doctorId", "==", params.id),
        where("consultationTime", "==", timestamp),
        where("cancelledByDoctor", "==", false)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty; // Return true if there are any bookings
    } catch (error) {
      console.error("Error checking slot availability:", error);
      return true; // Return true (booked) on error to prevent double booking
    }
  };

  const handleBookingClick = async () => {
    if (!auth.currentUser) {
      setShowLoginForm(true);
      onOpen();
      return;
    }

    // Check if user exists
    const userDoc = await getDoc(doc(db, "Users", auth.currentUser.uid));

    if (!userDoc.exists()) {
      // New user - show registration form
      setShowNewUserForm(true);
      onOpen();
    } else {
      // Existing user - proceed to payment
      await handlePayment(userDoc.data());
    }
  };

  const handlePayment = async (userData: any) => {
    try {
      const consultationTime = calculateSlotTimestamp(selectedDay, selectedSlot);


      // Calculate consultation duration based on specialization
      const consultationDuration = doctor!.specialization
        ?.toLowerCase()
        .includes("psycho")
        ? 50
        : 15;
      const consultationExpiration =
        consultationTime + consultationDuration * 60 * 1000; // Convert minutes to milliseconds

      // Create consultation document
      const consultationId = crypto.randomUUID();
      // Create a meeting room for video consultation
      const createMeetingRoom = async () => {
        try {
          const response = await fetch('https://api.videosdk.live/v2/rooms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `${process.env.NEXT_PUBLIC_VIDEOSDK_API_KEY}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to create meeting room');
          }

          const roomData = await response.json();
          return roomData.roomId;
        } catch (error) {
          console.error('Error creating meeting room:', error);
          return null;
        }
      };

      // Get meeting room ID for the consultation
      const meetingRoomId = await createMeetingRoom();
      const consultation = createNewConsultation(
        consultationId,
        userData.name,
        doctor!.name,
        consultationTime,
        [userData.uid, params.id as string],
        meetingRoomId,
        {
          patientName: userData.name,
          gender: userData.gender,
          patientAge: calculateAge(userData.dob).toString(),
          relationship: "self",
        },
        consultationExpiration
      );

      // Initialize payment
      const consultationFees = Number(doctor!.consultationFees);
      await initializeRazorpay({
        amount: (consultationFees + 50) * 100,
        currency: "INR",
        doctorName: doctor!.name,
        patientName: userData.name,
        consultationId,
        onSuccess: async (response) => {
          // 1. Save the consultation to Firestore (existing logic unchanged)
          await saveConsultation(consultation, response);

          // 2. Create a Google Meet link for the consultation
          let meetLink: string | null = null;
          try {
            const meetResponse = await fetch("/api/create-meet-link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                consultationId,
                consultationTime,
                doctorName: doctor!.name,
                patientName: userData.name,
                durationMinutes: doctor!.specialization
                  ?.toLowerCase()
                  .includes("psycho")
                  ? 50
                  : 15,
              }),
            });
            if (meetResponse.ok) {
              const meetData = await meetResponse.json();
              meetLink = meetData.meetLink || null;

              // 3. Update the Firestore consultation doc with the Meet link
              if (meetLink) {
                const { updateDoc, doc: firestoreDoc } = await import(
                  "firebase/firestore"
                );
                await updateDoc(
                  firestoreDoc(db, "Consultations", consultationId),
                  { "extras.meetLink": meetLink }
                );
              }
            }
          } catch (meetError) {
            console.error(
              "Meet link creation failed (non-fatal):",
              meetError
            );
          }

          // 4. Fetch patient FCM token and send push notification
          try {
            const userDocSnap = await getDoc(
              doc(db, "Users", userData.uid)
            );
            const fcmToken = userDocSnap.data()?.fcmToken || null;

            await fetch("/api/send-booking-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fcmToken,
                patientName: userData.name,
                doctorName: doctor!.name,
                consultationTime,
                meetLink,
              }),
            });
          } catch (fcmError) {
            console.error(
              "FCM notification failed (non-fatal):",
              fcmError
            );
          }

          // 5. Navigate to booking complete page
          router.push(`/booking-complete/${consultationId}`);
        },
        onFailure: (error) => {
          console.error("Payment failed:", error);
        },
      });
    } catch (error) {
      console.error("Error initiating payment:", error);
    }
  };

  const saveConsultation = async (
    consultation: Consultation,
    paymentResponse: any
  ) => {
    try {
      // Add payment details to consultation
      const consultationWithPayment = {
        ...consultation,
      };

      // Save consultation to Firestore
      await setDoc(
        doc(db, "Consultations", consultation.consultationId),
        consultationWithPayment
      );

      // Update the slot's bookingDate
      const dayKey = selectedDay;
      const slotIndex = slots[dayKey].availableSlots.findIndex(
        (slot) => slot.time === selectedSlot
      );

      if (slotIndex !== -1) {
        const updatedSlots = { ...slots };
        updatedSlots[dayKey].availableSlots[slotIndex].bookingDate =
          consultation.consultationTime;

        // Update the slots in Firestore
        await setDoc(
          doc(db, "Users", params.id as string, "Available Slots", dayKey),
          updatedSlots[dayKey]
        );
      }
    } catch (error) {
      console.error("Error saving consultation:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <Card className="w-full">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="rounded-xl w-48 h-48" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-1/3 rounded-lg" />
                <Skeleton className="h-4 w-1/4 rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!doctor) {
    return <div>Doctor not found</div>;
  }

  return (
    <div className="w-full p-4 md:p-8">
      <div className="max-w-[1920px] mx-auto">
        <Button
          className="mb-4"
          variant="light"
          startContent={<FaArrowLeft />}
          onPress={() => router.back()}
        >
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctor Info Card */}
          <div className="lg:col-span-2">
            <Card className="w-full">
              <CardBody className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Doctor Image Section */}
                  <div className="relative">
                    {doctor.profileImage ? (
                      <Image
                        src={doctor.profileImage}
                        alt={doctor.name}
                        className="w-48 h-48 rounded-xl object-cover shadow-md"
                      />
                    ) : (
                      <Avatar
                        name={doctor.name}
                        className="w-48 h-48 text-large rounded-xl shadow-md bg-primary/10"
                        classNames={{
                          name: "text-2xl font-semibold",
                        }}
                      />
                    )}
                  </div>

                  {/* Doctor Info Section */}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-2">
                      {doctor.specialization?.toLowerCase().includes("psycho")
                        ? doctor.name
                        : `Dr. ${doctor.name}`}
                    </h1>

                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <FaUserMd className="text-primary" />
                      <span>{doctor.specialization}</span>
                      <span className="mx-2">•</span>
                      <FaStar className="text-yellow-400" />
                      <span>{doctor.averageRating.toFixed(1)}</span>
                      <span className="mx-2">•</span>
                      <span>{doctor.numExp} years exp.</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <FaHospital className="text-gray-400" />
                      <span>{doctor.worksAt}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <FaMapMarkerAlt className="text-gray-400" />
                      <span>
                        {doctor.currentCity}, {doctor.currentState}
                      </span>
                    </div>

                    <Divider className="my-4" />

                    <div className="mb-4">
                      <h2 className="font-semibold mb-2">About</h2>
                      <p className="text-gray-600">{doctor.aboutMe}</p>
                    </div>

                    <div className="mb-4">
                      <h2 className="font-semibold mb-2">Languages</h2>
                      <div className="flex flex-wrap gap-2">
                        {(doctor.knownLanguages?.length
                          ? doctor.knownLanguages
                          : ["English"]
                        ).map((language, idx) => (
                          <Chip
                            key={idx}
                            startContent={
                              <FaLanguage className="text-gray-400" />
                            }
                          >
                            {language}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <Card>
                        <CardBody className="text-center">
                          <p className="text-sm text-gray-600">
                            Online Consultations
                          </p>
                          <p className="text-xl font-bold">
                            {doctor.numOnline}
                          </p>
                        </CardBody>
                      </Card>
                      <Card>
                        <CardBody className="text-center">
                          <p className="text-sm text-gray-600">
                            Offline Consultations
                          </p>
                          <p className="text-xl font-bold">
                            {doctor.numOffline}
                          </p>
                        </CardBody>
                      </Card>
                      <Card>
                        <CardBody className="text-center">
                          <p className="text-sm text-gray-600">
                            Years of Experience
                          </p>
                          <p className="text-xl font-bold">{doctor.numExp}</p>
                        </CardBody>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="w-full sticky top-4">
              <CardBody className="p-6">
                <h2 className="text-xl font-bold mb-6">Book Consultation</h2>

                {/* Day Selection */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Select Day</h3>
                  {getAvailableDays().length > 0 ? (
                    <Tabs
                      selectedKey={selectedDay}
                      onSelectionChange={(key) => {
                        setSelectedDay(key as string);
                        setSelectedSlot(""); // Reset selected slot when day changes
                      }}
                      className="w-full"
                      variant="bordered"
                    >
                      {getAvailableDays().map((day) => (
                        <Tab key={day} title={formatDayLabel(day)} />
                      ))}
                    </Tabs>
                  ) : (
                    <p className="text-gray-500 text-sm">No consultation days configured for this doctor.</p>
                  )}
                </div>

                {/* Time Slots */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">
                    Available Slots
                  </h3>
                  {selectedDay && (
                    <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto">
                      {filteredSlots.length > 0 ? (
                        filteredSlots.map((slot, index) => {
                          const isBooked = slot.bookingDate
                            ? slot.bookingDate > Date.now()
                            : false;
                          return (
                            <Button
                              key={index}
                              size="sm"
                              variant={
                                selectedSlot === slot.time
                                  ? "solid"
                                  : "bordered"
                              }
                              color={isBooked ? "default" : "primary"}
                              onPress={() =>
                                !isBooked && setSelectedSlot(slot.time)
                              }
                              startContent={<FaClock className="text-xs" />}
                              className="justify-start"
                              isDisabled={isBooked}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span>{slot.time}</span>
                                {isBooked && (
                                  <span className="text-xs text-gray-500">
                                    Booked
                                  </span>
                                )}
                              </div>
                            </Button>
                          );
                        })
                      ) : (
                        <p className="text-gray-500 col-span-2 text-center py-4">
                          No slots available for this day
                        </p>
                      )}
                    </div>
                  )}
                  {selectedDay === getCurrentDay() && (
                    <p className="text-xs text-gray-500 mt-2">
                      * Showing slots available after current time
                    </p>
                  )}
                </div>

                {/* Book Button */}
                <Button
                  color="primary"
                  className="w-full"
                  size="lg"
                  isDisabled={!selectedSlot}
                  onPress={handleBookingClick}
                >
                  Book Consultation @ ₹
                  {doctor?.consultationFees
                    ? Number(doctor.consultationFees) + 50
                    : 0}
                </Button>

                <div className="mt-4 text-xs text-gray-500">
                  <p>• Platform fee: ₹50</p>
                  <p>
                    • Consultation duration:{" "}
                    {doctor.specialization?.toLowerCase().includes("psycho")
                      ? "50 minutes"
                      : "15 minutes"}
                  </p>
                  <p>• Free cancellation available</p>
                  <p>• Booking confirmation via SMS/Email</p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Login/Registration Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setShowLoginForm(false);
          setShowNewUserForm(false);
        }}
        size="lg"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {showLoginForm
                  ? "Sign In to Continue"
                  : showNewUserForm
                    ? "Complete Your Profile"
                    : "Patient Details"}
              </ModalHeader>
              <ModalBody>
                {showLoginForm ? (
                  <LoginForm
                    onSuccess={() => {
                      setShowLoginForm(false);
                      handleBookingClick(); // Re-trigger the flow
                    }}
                  />
                ) : showNewUserForm ? (
                  <NewUserForm
                    uid={auth.currentUser!.uid}
                    phoneNumber={auth.currentUser!.phoneNumber || ""}
                    onSuccess={() => {
                      onClose();
                      handleBookingClick(); // Re-trigger the flow
                    }}
                  />
                ) : (
                  <PatientForm
                    doctorId={params.id as string}
                    selectedSlot={selectedSlot}
                    onSuccess={() => {
                      onClose();
                      router.push("/bookings");
                    }}
                  />
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
