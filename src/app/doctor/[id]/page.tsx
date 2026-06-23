"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, Image, Avatar, Chip, Skeleton, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, useDisclosure, Spinner } from "@nextui-org/react";
import {
  FaStar,
  FaLanguage,
  FaMapMarkerAlt,
  FaHospital,
  FaUserMd,
  FaArrowLeft,
  FaClock,
  FaStethoscope,
} from "react-icons/fa";
import { Logo } from "@/components/ui/Logo";

import { motion } from "framer-motion";

import { initializeRazorpay } from "@/services/payment";
import { createNewConsultation, Consultation } from "@/types/consultation"; // import { Consultation, PatientDetails } from "@/types/consultation";
import NewUserForm from "@/components/forms/NewUserForm";
import { calculateAge } from "@/types/patient";
import LoginForm from "@/components/forms/LoginForm";
import PatientForm from "@/components/forms/PatientForm";
import { Footer } from "@/components/layout/Footer";
import { getActiveTimezone, getTimezoneName, parseISTTimeToEpoch, formatTimeRange } from "@/utils/timezone";
import { Coupon } from "@/types/coupon";
import { validateCoupon } from "@/utils/coupon";
import { Input } from "@nextui-org/react";

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
  email?: string;
  phoneNumber: string;
  whatsappNumber?: string;
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
    isBooked?: boolean;
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
  calculatedTimestamp?: number;
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
  const [isBookingProcessing, setIsBookingProcessing] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [couponError, setCouponError] = useState("");
  const [consultationCount, setConsultationCount] = useState<number | string>(0);

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
      if (!dayKey || !timeRange) return 0;
      // Actual implementation would be here, for now use them to avoid lint errors
      const [startTime] = timeRange.split(" - ");
      return startTime ? 1 : 0; // Dummy logic using the variables
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

  const generateDynamicSlots = useCallback((dayKey: string) => {
    if (!doctor?.timeSlots || !doctor?.slotDuration) return [];

    const dayNameMap: { [key: string]: string } = {
      Sun: "sunday", Mon: "monday", Tue: "tuesday", Wed: "wednesday",
      Thu: "thursday", Fri: "friday", Sat: "saturday",
    };

    const daySchedule = doctor.timeSlots[dayNameMap[dayKey]];
    if (!daySchedule || !daySchedule.enabled) return [];

    const slots: Slot[] = [];
    const startEpoch = parseISTTimeToEpoch(dayKey, daySchedule.startTime);
    const endEpoch = parseISTTimeToEpoch(dayKey, daySchedule.endTime);

    if (!startEpoch || !endEpoch) return [];

    let currentEpoch = startEpoch;
    while (currentEpoch < endEpoch) {
      slots.push({
        time: formatTimeRange(currentEpoch, doctor.slotDuration),
        bookingDate: currentEpoch,
      });
      currentEpoch += doctor.slotDuration * 60000;
    }

    return slots;
  }, [doctor]);

  // Coupon functions
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!auth.currentUser) {
      setShowLoginForm(true);
      onOpen();
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError("");

    try {
      const couponRef = doc(db, "coupons", couponCode.trim());
      const couponSnap = await getDoc(couponRef);

      if (!couponSnap.exists()) {
        setCouponError("Invalid coupon code");
        setAppliedCoupon(null);
        setCouponDiscount(0);
        return;
      }

      const couponData = { id: couponSnap.id, ...couponSnap.data() } as Coupon;
      const consultationFees = Number(doctor!.consultationFees);
      const totalPayableAmount = consultationFees + 50;

      const validation = validateCoupon(
        couponData,
        auth.currentUser.uid,
        params.id as string,
        totalPayableAmount
      );

      if (validation.isValid) {
        setAppliedCoupon(couponData);
        setCouponDiscount(validation.discountAmount || 0);
        setCouponError("");
      } else {
        setCouponError(validation.error || "Coupon validation failed");
        setAppliedCoupon(null);
        setCouponDiscount(0);
      }
    } catch (err) {
      console.error("Error applying coupon:", err);
      setCouponError("An error occurred while applying the coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const fetchAvailableCoupons = useCallback(async () => {
    try {
      const couponsRef = collection(db, "coupons");
      const querySnapshot = await getDocs(couponsRef);

      const coupons: Coupon[] = [];
      const doctorId = params.id as string;
      const currentUserUid = auth.currentUser?.uid;

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Coupon;
        const isVisible = data.tray_visibility === true || String(data.tray_visibility) === "true";
        const expiryDate = new Date(data.couponExpiry).getTime();
        const isExpired = isNaN(expiryDate) || expiryDate < Date.now();
        const matchesDoctor = !data.targetedDoctorIds || data.targetedDoctorIds.length === 0 || data.targetedDoctorIds.includes(doctorId);

        let matchesUser = true;
        if (data.couponType === "Targeted" && data.targetedUserIds && data.targetedUserIds.length > 0) {
          matchesUser = !!currentUserUid && data.targetedUserIds.includes(currentUserUid);
        }

        const isWithinGlobalLimit = data.couponType !== "Targeted" || (data.currentUsageCount < (data.maxUsageLimit || Infinity));
        const userUsage = currentUserUid ? (data.usedByUserIds || []).filter(id => id === currentUserUid).length : 0;
        const limit = data.per_user_limit || 1;
        const isWithinUserLimit = userUsage < limit;

        if (isVisible && !isExpired && matchesDoctor && matchesUser && isWithinGlobalLimit && isWithinUserLimit) {
          coupons.push(data);
        }
      });
      setAvailableCoupons(coupons);
    } catch (err) {
      console.error(">>> [COUPON] Error fetching available coupons:", err);
    }
  }, [params.id]);

  const fetchConsultationCount = useCallback(async () => {
    try {
      const consultationsRef = collection(db, "Consultations");
      const q = query(
        consultationsRef,
        where("participants", "array-contains", params.id)
      );
      const snapshot = await getCountFromServer(q);
      const count = snapshot.data().count;
      setConsultationCount(count);
    } catch (err) {
      console.error("Error fetching consultation count:", err);
    }
  }, [params.id]);

  // Function to check if a slot is booked
  const isSlotBooked = useCallback(async (timestamp: number) => {
    try {
      // Query consultations collection for this doctor and time slot
      const consultationsRef = collection(db, "Consultations");
      const q = query(
        consultationsRef,
        where("participants", "array-contains", params.id),
        where("consultationTime", "==", timestamp),
        where("cancelledByDoctor", "==", false)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty; // Return true if there are any bookings
    } catch (error) {
      console.error("Error checking slot availability:", error);
      return true; // Return true (booked) on error to prevent double booking
    }
  }, [params.id]);

  // Function to filter and sort available slots
  const getFilteredSlots = useCallback(async (slots: DaySlots["availableSlots"]) => {
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
          // Skip slots already marked as booked in the DB
          if (slot.isBooked === true) return false;

          // For today, only show future slots (with 10 minute buffer)
          if (selectedDay === getCurrentDay()) {
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
  }, [selectedDay, doctor, isSlotBooked, generateDynamicSlots]);

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
        await fetchAvailableCoupons();
        await fetchConsultationCount();

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
  }, [params.id, fetchAvailableCoupons, fetchConsultationCount]);

  useEffect(() => {
    if (selectedDay) {
      getFilteredSlots(slots[selectedDay]?.availableSlots || []).then(
        setFilteredSlots
      );
    }
  }, [selectedDay, slots, getFilteredSlots]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAvailableCoupons();
      }
    });
    return () => unsubscribe();
  }, [fetchAvailableCoupons]);

  /* Commented out unused sortSlots
  const sortSlots = (slots: { bookingDate: number; time: string }[]) => {
    return slots.sort((a, b) => a.bookingDate - b.bookingDate);
  };
  */

  /* Commented out unused formatDate
  const formatDate = (epoch: number) => {
    const date = new Date(epoch);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  */

  /* Commented out unused groupSlotsByDate
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
  */



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
      const userData = userDoc.data() as unknown as { name: string; email?: string; phoneNumber: string; gender: "Male" | "Female" | "Other"; dob: number; uid: string };
      // If email is missing in Firestore but present in Auth, update it
      if (!userData.email && auth.currentUser?.email) {
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "Users", auth.currentUser.uid), {
          email: auth.currentUser.email
        });
        userData.email = auth.currentUser.email;
      }
      await handlePayment(userData);
    }
  };

  const handlePayment = async (userData: { name: string; email?: string; phoneNumber: string; gender: "Male" | "Female" | "Other"; dob: number; uid: string }) => {
    try {
      const selectedSlotObj = filteredSlots.find(s => s.time === selectedSlot);
      const consultationTime = selectedSlotObj?.calculatedTimestamp || calculateSlotTimestamp(selectedDay, selectedSlot);
      const userTimezone = getActiveTimezone();


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

      // Use consultationId as the meetingRoomId placeholder (Meet link will be added later by scheduler)
      const meetingRoomId = consultationId;

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
        consultationExpiration,
        userTimezone,
        appliedCoupon?.couponCode || null,
        couponDiscount,
        userData.phoneNumber,
        doctor!.whatsappNumber
      );

      // Initialize payment
      const consultationFees = Number(doctor!.consultationFees);
      const totalAmount = Math.max(0, consultationFees + 50 - couponDiscount);

      const processSuccessfulBooking = async (paymentResponse?: unknown) => {
        const t0 = Date.now();
        const ts = () => `[+${((Date.now() - t0) / 1000).toFixed(2)}s]`;
        console.log(`>>> [BOOKING DEBUG] ${ts()} START`, {
          consultationId,
          patientPhone: userData.phoneNumber,
          patientEmail: userData.email,
        });

        setIsBookingProcessing(true);
        setBookingStatus(
          totalAmount === 0
            ? "Securing your complimentary slot..."
            : "Verifying payment and securing your slot..."
        );

        // 1. Save the consultation to Firestore (existing logic unchanged)
        console.log(`>>> [BOOKING DEBUG] ${ts()} STEP 1: writing Consultations/${consultationId} to Firestore`);
        try {
          await saveConsultation(consultation, paymentResponse || { status: "free" });
          console.log(`>>> [BOOKING DEBUG] ${ts()} STEP 1: Firestore write COMPLETE (a Cloud Function trigger on Consultations.onCreate may fire WhatsApp from here)`);
        } catch (error) {
          console.error("Save consultation failed:", error);
          setError(
            totalAmount === 0
              ? "Failed to save booking. Please contact support."
              : "Payment received but failed to save booking. Please contact support."
          );
          setIsBookingProcessing(false);
          return;
        }

        // 2. Create a Google Meet link for the consultation
        setBookingStatus("Scheduling your Google Meet session...");
        let meetLink: string | null = null;
        try {
          console.log(`>>> [BOOKING DEBUG] ${ts()} STEP 2: calling /api/schedule-meet (external meet-scheduler.soocher.in)`);
          const meetResponse = await fetch("/api/schedule-meet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consultationId,
              consultationTime,
              doctorName: doctor!.name,
              patientName: userData.name,
              patientEmail: userData.email || auth.currentUser?.email || "",
              patientPhone: userData.phoneNumber || "",
              doctorPhone: doctor!.whatsappNumber || "",
              specialization: doctor!.specialization || "",
              timezone: userTimezone,
            }),
          });
          if (meetResponse.ok) {
            const meetData = await meetResponse.json();
            meetLink = meetData.meetLink || null;

            // 3. Update the Firestore consultation doc with the Meet link
            if (meetLink) {
              console.log(`>>> [BOOKING DEBUG] ${ts()} STEP 3: meet link received, updating Consultations.${consultationId}.extras.meetLink (this triggers a Consultations.onUpdate Cloud Function if one exists)`);
              const { updateDoc, doc: firestoreDoc } = await import(
                "firebase/firestore"
              );
              await updateDoc(
                firestoreDoc(db, "Consultations", consultationId),
                { "extras.meetLink": meetLink }
              );
              console.log(`>>> [BOOKING DEBUG] ${ts()} STEP 3: meetLink update COMPLETE`);
            } else {
              console.log(`>>> [BOOKING DEBUG] ${ts()} STEP 3: skipped — no meetLink returned`);
            }
          }
        } catch (meetError) {
          console.error(
            "Meet link creation failed (non-fatal):",
            meetError
          );
        }

        // 4. Save Stream.io video call ID to Firestore
        try {
          const streamCallId = `consultation_${consultationId}`;
          const { updateDoc, doc: firestoreDoc } = await import("firebase/firestore");
          await updateDoc(
            firestoreDoc(db, "Consultations", consultationId),
            { "extras.streamCallId": streamCallId }
          );
          console.log(`>>> [BOOKING DEBUG] ${ts()} STEP 4: streamCallId saved — ${streamCallId}`);
        } catch (streamError) {
          console.error("Stream call ID save failed (non-fatal):", streamError);
        }

        console.log(`>>> [BOOKING DEBUG] ${ts()} END — no further outbound calls from this app. Any WhatsApp arriving NOW is from a backend listener.`);

        // Complete booking - external service handles notifications
        setBookingStatus("Booking confirmed! Redirecting...");
        setTimeout(() => {
          setIsBookingProcessing(false);
          router.push(`/booking-complete/${consultationId}`);
        }, 1500);
      };

      if (totalAmount === 0) {
        // Skip Razorpay if total is 0 after coupon
        await processSuccessfulBooking();
      } else {
        await initializeRazorpay({
          amount: totalAmount * 100, // Amount is in paisa
          currency: "INR",
          doctorName: doctor!.name,
          patientName: userData.name,
          consultationId,
          onSuccess: async (response) => {
            await processSuccessfulBooking(response);
          },
          onFailure: (error) => {
            console.error("Payment failed:", error);
          },
        });
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
    }
  };

  const saveConsultation = async (
    consultation: Consultation,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _paymentResponse: unknown
  ) => {
    try {
      // Add payment details to consultation
      // const consultationWithPayment = {
      //   ...consultation,
      // };

      // Save consultation to Firestore.
      // `source` marks bookings created by this web app so the legacy
      // sendBookedAppointmentNotification Cloud Function can skip them
      // (web app already sends its own WhatsApp confirmation).
      const consultationWithDiscount = {
        ...consultation,
        appliedCoupon: appliedCoupon?.couponCode || null,
        couponDiscount: couponDiscount,
        source: "web-booking-v2",
        skipLegacyNotifications: true,
        wa_noti_15min: false
      };

      // DEBUG: Log the consultation data before saving
      console.log(">>> [BOOKING DEBUG] Saving NEW consultation to Firestore:", JSON.stringify(consultationWithDiscount, null, 2));

      await setDoc(
        doc(db, "Consultations", consultation.consultationId),
        consultationWithDiscount
      );

      // 3. Update Coupon Usage count if applicable
      if (appliedCoupon && auth.currentUser) {
        const { updateDoc, increment, arrayUnion } = await import("firebase/firestore");
        const couponRef = doc(db, "coupons", appliedCoupon.id);

        await updateDoc(couponRef, {
          usedByUserIds: arrayUnion(auth.currentUser.uid),
          currentUsageCount: increment(1)
        });
      }

      // Mark the slot as booked in Firestore
      const dayKey = selectedDay;
      const slotIndex = slots[dayKey]?.availableSlots?.findIndex(
        (slot) => slot.time === selectedSlot
      ) ?? -1;

      if (slotIndex !== -1) {
        const updatedSlots = JSON.parse(JSON.stringify(slots)) as AvailableSlots;
        // Update bookingDate and mark as booked
        updatedSlots[dayKey].availableSlots[slotIndex].bookingDate =
          consultation.consultationTime;
        updatedSlots[dayKey].availableSlots[slotIndex].isBooked = true;

        // Persist updated slot data to Firestore
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(
          doc(db, "Users", params.id as string, "Available Slots", dayKey),
          { availableSlots: updatedSlots[dayKey].availableSlots }
        );

        // Update local state so the slot disappears immediately from UI
        setSlots(updatedSlots);
      }
    } catch (error) {
      console.error("Error saving consultation:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-10 w-24 rounded-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="premium-card">
                <CardBody className="p-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    <Skeleton className="rounded-[32px] w-48 h-48" />
                    <div className="flex-1 space-y-4">
                      <Skeleton className="h-10 w-1/2 rounded-xl" />
                      <Skeleton className="h-6 w-1/3 rounded-lg" />
                      <Skeleton className="h-20 w-full rounded-2xl" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-[500px] w-full rounded-[32px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-800">Doctor not found</h1>
          <Button color="primary" variant="flat" onPress={() => router.push("/")}>
            Go Back Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar Container */}
      <header className="w-full px-4 md:px-6 py-4">
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

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="premium-card overflow-hidden">
              <CardBody className="p-0">
                <div className="h-32 bg-gradient-to-tr from-primary to-primary-600 opacity-90" />
                <div className="px-4 md:px-8 pb-8">
                  <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end text-center md:text-left">
                    <div className="relative -mt-12 md:-mt-16 z-10">
                      {doctor.profileImage ? (
                        <Image
                          src={doctor.profileImage}
                          alt={doctor.name}
                          className="w-32 h-32 md:w-40 md:h-40 rounded-[24px] md:rounded-[32px] object-cover ring-8 ring-white shadow-xl bg-white"
                        />
                      ) : (
                        <Avatar
                          name={doctor.name}
                          className="w-32 h-32 md:w-40 md:h-40 text-4xl font-bold rounded-[24px] md:rounded-[32px] ring-8 ring-white shadow-xl bg-primary/10 text-primary"
                        />
                      )}
                      <div className="absolute -bottom-2 -right-2 md:bottom-2 md:-right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 pt-4 md:pt-0 w-full">
                      <div className="flex flex-col md:flex-row items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                          {doctor.specialization?.toLowerCase().includes("psycho")
                            ? doctor.name
                            : `Dr. ${doctor.name}`}
                        </h1>
                        <Chip size="sm" color="success" variant="flat" className="bg-success-50 text-success-600 font-bold border-none mt-2 md:mt-0">
                          Verified Specialist
                        </Chip>
                      </div>
                      <div className="flex flex-col md:flex-row flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-6 text-slate-500 font-medium text-sm md:text-base">
                        <div className="flex items-center gap-2">
                          <FaUserMd className="text-primary/70" />
                          <span>{doctor.specialization}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaStar className="text-amber-400" />
                          <span className="text-slate-900 font-bold">{(doctor.averageRating ?? 0).toFixed(1)}</span>
                          <span className="text-slate-400">Rating</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaClock className="text-primary/70" />
                          <span>{doctor.numExp} Years Experience</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h2 className="text-lg font-bold text-slate-900">Professional Bio</h2>
                        <p className="text-slate-600 leading-relaxed">
                          {doctor.aboutMe || "A highly dedicated and experienced medical professional committed to providing exceptional healthcare and personalized treatment plans for every patient."}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h2 className="text-lg font-bold text-slate-900">Practice Details</h2>
                        <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-4 text-slate-700">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                              <FaHospital />
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-bold uppercase">Clinic/Hospital</p>
                              <p className="font-semibold">{doctor.worksAt || "Private Practice"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-slate-700">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                              <FaMapMarkerAlt />
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-bold uppercase">Location</p>
                              <p className="font-semibold">{doctor.currentCity}, {doctor.currentState}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h2 className="text-lg font-bold text-slate-900">Patient Communication</h2>
                        <div className="flex flex-wrap gap-2">
                          {(doctor.knownLanguages?.length ? doctor.knownLanguages : ["English", "Hindi"]).map((language, idx) => (
                            <Chip
                              key={idx}
                              variant="flat"
                              className="bg-primary/5 text-primary border-none px-4 font-semibold"
                              startContent={<FaLanguage className="text-xs opacity-60" />}
                            >
                              {language}
                            </Chip>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-lg font-bold text-slate-900">Analytics Overview</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                            <p className="text-2xl font-black text-primary">
                              {typeof consultationCount === 'string' && consultationCount.endsWith('+')
                                ? consultationCount
                                : `${consultationCount}+`}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Online Consul</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                            <p className="text-2xl font-black text-slate-800">
                              {doctor.numExp ? String(doctor.numExp).padStart(2, '0') : '00'}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Years Active</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Booking Column */}
          <div className="lg:col-span-1 border-none">
            <Card className="premium-card sticky top-32 overflow-hidden border-2 border-primary/10">
              <CardBody className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Book Now</h2>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Consultation Fee</p>
                    <div className="flex flex-col items-end">
                      {couponDiscount > 0 && (
                        <span className="text-sm font-bold text-slate-400 line-through">
                          ₹{doctor?.consultationFees ? Number(doctor.consultationFees) + 50 : 0}
                        </span>
                      )}
                      <p className="text-2xl font-black text-primary">
                        ₹{doctor?.consultationFees ? (Number(doctor.consultationFees) + 50 - couponDiscount) : 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Day Selection */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">1. Select Appointment Date</label>
                    {getAvailableDays().length > 0 ? (
                      <Tabs
                        selectedKey={selectedDay}
                        onSelectionChange={(key) => {
                          setSelectedDay(key as string);
                          setSelectedSlot("");
                        }}
                        className="w-full"
                        variant="underlined"
                        classNames={{
                          tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                          cursor: "w-full bg-primary",
                          tab: "max-w-fit px-0 h-12",
                          tabContent: "group-data-[selected=true]:text-primary font-bold text-sm"
                        }}
                      >
                        {getAvailableDays().map((day) => (
                          <Tab key={day} title={formatDayLabel(day)} />
                        ))}
                      </Tabs>
                    ) : (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-amber-700 text-xs font-medium">No booking slots currently configured.</p>
                      </div>
                    )}
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">2. Select Preferred Time</label>
                    {selectedDay && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] pr-2 overflow-y-auto custom-scrollbar">
                          {filteredSlots.length > 0 ? (
                            filteredSlots.map((slot, index) => {
                              const isBooked = slot.isBooked;
                              const isSelected = selectedSlot === slot.time;
                              return (
                                <button
                                  key={index}
                                  disabled={isBooked}
                                  onClick={() => !isBooked && setSelectedSlot(slot.time)}
                                  className={`
                                    flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200
                                    ${isBooked ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100' :
                                      isSelected ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' :
                                        'bg-white border-slate-100 hover:border-primary/30 text-slate-600'}
                                  `}
                                >
                                  <span className={`text-xs font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>Session</span>
                                  <span className="text-sm font-black">{slot.time.split(' - ')[0]}</span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="col-span-2 py-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                              <FaClock className="mx-auto text-3xl text-slate-300 mb-3" />
                              <p className="text-slate-400 text-sm font-medium">No available slots</p>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-center pt-2">
                          <p className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-200/50 text-xs text-amber-900 font-bold tracking-wide shadow-sm">
                            <FaClock className="text-amber-500" />
                            All times shown in {getTimezoneName(getActiveTimezone())}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coupon Section */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">3. Apply Coupon Code</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={couponCode}
                        onValueChange={setCouponCode}
                        variant="flat"
                        className="flex-1"
                        classNames={{
                          inputWrapper: "bg-slate-50 border border-slate-100 rounded-xl h-12"
                        }}
                        isDisabled={!!appliedCoupon}
                      />
                      {appliedCoupon ? (
                        <Button
                          color="danger"
                          variant="flat"
                          className="rounded-xl h-12 font-bold"
                          onPress={() => {
                            setAppliedCoupon(null);
                            setCouponDiscount(0);
                            setCouponCode("");
                          }}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          color="primary"
                          className="rounded-xl h-12 font-bold"
                          isLoading={isApplyingCoupon}
                          onPress={handleApplyCoupon}
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                    {couponError && <p className="text-[10px] text-danger font-bold ml-1">{couponError}</p>}
                    {appliedCoupon && !couponError && (
                      <p className="text-[10px] text-success font-bold ml-1 flex items-center gap-1">
                        <FaStar className="text-[8px]" /> Coupon &quot;{appliedCoupon.couponCode}&quot; applied! You saved ₹{couponDiscount}
                      </p>
                    )}

                    {/* Coupon Tray */}
                    {availableCoupons.length > 0 && !appliedCoupon && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Available Offers</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                          {availableCoupons.map((coupon) => (
                            <div
                              key={coupon.id}
                              onClick={() => {
                                setCouponCode(coupon.couponCode);
                                // Trigger apply automatically or let user click Apply
                              }}
                              className="flex-shrink-0 cursor-pointer p-3 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors min-w-[120px]"
                            >
                              <p className="text-xs font-black text-primary">{coupon.couponCode}</p>
                              <p className="text-[8px] font-bold text-primary/60">
                                {coupon.isPercentage ? `${coupon.couponValue}% OFF` : `₹${coupon.couponValue} OFF`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Book Button */}
                  <div className="pt-4 space-y-4">
                    {/* Final Price Summary */}
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <span className="text-sm font-bold text-slate-700">Total Payable Amount</span>
                      <span className="text-2xl font-black text-primary">
                        ₹{doctor?.consultationFees ? (Number(doctor.consultationFees) + 50 - couponDiscount) : 0}
                      </span>
                    </div>

                    <Button
                      color="primary"
                      className="w-full rounded-[24px] h-16 text-lg font-black shadow-[0_20px_40px_rgba(46,109,212,0.3)] disabled:opacity-50 disabled:shadow-none"
                      isDisabled={!selectedSlot}
                      onPress={handleBookingClick}
                    >
                      Process Booking
                    </Button>
                    <div className="mt-6 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                        <span>CONSULTATION PERIOD</span>
                        <span className="text-slate-600 uppercase">
                          {doctor.specialization?.toLowerCase().includes("psycho") ? "50 MINUTES" : "15 MINUTES"}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                        <span>CANCELLATION POLICY</span>
                        <span className="text-green-600 uppercase">FREE CANCELLATION</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                        <span>CONFIRMATION</span>
                        <span className="text-slate-600 uppercase">INSTANT VIA SMS</span>
                      </p>
                    </div>
                  </div>
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
        classNames={{
          backdrop: "bg-[#2e6dd4]/20 backdrop-blur-md",
          base: "rounded-[32px] border-none",
          header: "border-b border-slate-100 p-8",
          body: "p-8",
        }}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: 20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          }
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-slate-900">
                  {showLoginForm
                    ? "Welcome Back"
                    : showNewUserForm
                      ? "Create Your Profile"
                      : "Patient Information"}
                </h2>
                <p className="text-sm font-medium text-slate-400 italic">
                  Complete these details to finalize your appointment.
                </p>
              </ModalHeader>
              <ModalBody>
                {showLoginForm ? (
                  <LoginForm
                    onSuccess={() => {
                      setShowLoginForm(false);
                      handleBookingClick();
                    }}
                  />
                ) : showNewUserForm ? (
                  <NewUserForm
                    uid={auth.currentUser!.uid}
                    phoneNumber={auth.currentUser!.phoneNumber || ""}
                    email={auth.currentUser!.email || ""}
                    onSuccess={() => {
                      onClose();
                      handleBookingClick();
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

      {/* Booking Loading Modal */}
      <Modal
        isOpen={isBookingProcessing}
        isDismissable={false}
        hideCloseButton
        classNames={{
          backdrop: "bg-[#2e6dd4]/20 backdrop-blur-xl",
          base: "bg-white/80 backdrop-blur-xl rounded-[40px] border-none shadow-2xl",
        }}
      >
        <ModalContent>
          <ModalBody className="py-12 px-8">
            <div className="flex flex-col items-center justify-center text-center space-y-8">
              <div className="relative">
                <Spinner size="lg" color="primary" labelColor="primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full animate-ping" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Processing Booking</h3>
                <p className="text-slate-500 font-medium px-4">{bookingStatus}</p>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Error Message Toast/Alert */}
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-danger text-white p-4 rounded-2xl shadow-xl flex items-center justify-between"
          >
            <span className="text-sm font-bold">{error}</span>
            <Button size="sm" variant="light" color="default" className="text-white min-w-unit-12" onPress={() => setError("")}>Dismiss</Button>
          </motion.div>
        </div>
      )}
      <Footer />
    </div>
  );
}
