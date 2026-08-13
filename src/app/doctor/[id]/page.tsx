"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  documentId,
  getDoc,
  collection,
  getDocs,
  setDoc,
  query,
  where,
  getCountFromServer,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { auth } from "@/lib/firebase-auth";
import { db } from "@/lib/firebase-db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, Avatar, Chip, Modal, ModalContent, ModalHeader, ModalBody, useDisclosure, Spinner } from "@nextui-org/react";
import {
  FaStar,
  FaLanguage,
  FaMapMarkerAlt,
  FaHospital,
  FaUserMd,
  FaArrowLeft,
  FaClock,
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
import { parseTimeToEpoch, formatTimeRange } from "@/utils/timezone";
import { UserTimezoneProvider, useUserTimezone } from "@/hooks/useUserTimezone";
import { Coupon } from "@/types/coupon";
import { validateCoupon } from "@/utils/coupon";
import { Input } from "@nextui-org/react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { getCachedDoctorById } from "@/lib/doctors";
import { AppShimmer } from "@/components/loading/AppShimmer";
import { formatCountWithPlus } from "@/utils/format-count";

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
  timezone?: string;
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

/**
 * Which of these slot times are already taken.
 *
 * Results are cached by (doctor, exact slot times). The slot list is recomputed
 * whenever the visitor's timezone resolves from geolocation, a second or two
 * after load — but timezone only changes the *labels*, not the underlying epoch
 * timestamps, so without this the page silently re-ran every availability query
 * for an identical answer.
 *
 * The query itself is a single range scan; see `rangeQuery` below.
 */
const bookedTimestampCache = new Map<string, Promise<Set<number>>>();

function fetchBookedTimestamps(
  doctorId: string,
  timestamps: number[]
): Promise<Set<number>> {
  if (timestamps.length === 0) return Promise.resolve(new Set<number>());

  const sorted = [...timestamps].sort((a, b) => a - b);
  const cacheKey = `${doctorId}|${sorted.join(",")}`;

  const cached = bookedTimestampCache.get(cacheKey);
  if (cached) return cached;

  const collect = (snaps: QuerySnapshot<DocumentData>[]) => {
    const booked = new Set<number>();
    snaps.forEach((snap) =>
      snap.docs.forEach((d) => {
        if (!d.data().cancelledByDoctor) {
          booked.add(d.data().consultationTime as number);
        }
      })
    );
    return booked;
  };

  /**
   * One range scan over the day's window instead of ceil(N/30) `in` queries.
   * The slots being checked are always a contiguous span of one day, so
   * [first, last] covers them in a single round trip no matter how many slots
   * the doctor offers. It may return a few consultations at times we did not
   * ask about; membership is resolved against the Set either way.
   */
  const rangeQuery = () =>
    getDocs(
      query(
        collection(db, "Consultations"),
        where("participants", "array-contains", doctorId),
        where("consultationTime", ">=", sorted[0]),
        where("consultationTime", "<=", sorted[sorted.length - 1])
      )
    ).then((snap) => collect([snap]));

  /**
   * Fallback for projects whose composite index only covers the equality form.
   * A missing index surfaces as `failed-precondition`, and slot availability is
   * too important to break on it — so we retry with the original chunked `in`
   * queries, which use the index that is already in place.
   */
  const chunkedQuery = () => {
    const chunkSize = 30; // Firestore "in" limit
    const chunks: number[][] = [];
    for (let i = 0; i < sorted.length; i += chunkSize) {
      chunks.push(sorted.slice(i, i + chunkSize));
    }
    return Promise.all(
      chunks.map((chunk) =>
        getDocs(
          query(
            collection(db, "Consultations"),
            where("participants", "array-contains", doctorId),
            where("consultationTime", "in", chunk)
          )
        )
      )
    ).then(collect);
  };

  const pending = rangeQuery()
    .catch((err: { code?: string }) => {
      if (err?.code !== "failed-precondition") throw err;
      console.warn(
        "[slots] range index missing, falling back to chunked queries. " +
          "Deploy firestore.indexes.json to halve the read count."
      );
      return chunkedQuery();
    })
    .catch((err) => {
      // Don't cache a failure — the next attempt should hit the network again.
      bookedTimestampCache.delete(cacheKey);
      throw err;
    });

  bookedTimestampCache.set(cacheKey, pending);
  return pending;
}

function DoctorDetailsContent() {
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

  // Resolve the visitor's timezone from geolocation (falls back to browser Intl).
  const { timezone: userTimezone } = useUserTimezone();

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
    });
  };

  const formatDateLabel = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  /**
   * Epoch for a stored slot whose document predates the `bookingDate` field.
   *
   * This was previously stubbed to `return startTime ? 1 : 0`, i.e. every such
   * slot claimed to start at epoch 1 (Jan 1970). That made them look like they
   * were in the past, so they were filtered out of today's list entirely, and
   * the availability lookup queried `consultationTime == 1` for them.
   *
   * `timeRange` is a display range ("08:00PM - 08:15PM"); only the start matters,
   * and it is wall-clock in the *doctor's* timezone — the same basis
   * generateDynamicSlots uses, so both paths produce comparable timestamps.
   */
  const calculateSlotTimestamp = useCallback(
    (dayKey: string, timeRange: string) => {
      try {
        if (!dayKey || !timeRange) return 0;
        const [startTime] = timeRange.split(" - ");
        if (!startTime) return 0;
        return parseTimeToEpoch(
          dayKey,
          startTime.trim(),
          doctor?.timezone || "Asia/Kolkata"
        );
      } catch (error) {
        console.error("Error calculating slot timestamp:", error);
        return 0;
      }
    },
    [doctor?.timezone]
  );

  // Function to get available days
  const getAvailableDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const todayIndex = today.getDay();

    // Always show the next 3 consecutive booking days, including today.
    const availableDays = [];
    for (let i = 0; i < 3; i++) {
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
    const doctorTz = doctor.timezone || "Asia/Kolkata";
    const startEpoch = parseTimeToEpoch(dayKey, daySchedule.startTime, doctorTz);
    const endEpoch = parseTimeToEpoch(dayKey, daySchedule.endTime, doctorTz);

    if (!startEpoch || !endEpoch) return [];

    let currentEpoch = startEpoch;
    while (currentEpoch < endEpoch) {
      slots.push({
        time: formatTimeRange(currentEpoch, doctor.slotDuration, userTimezone),
        bookingDate: currentEpoch,
      });
      currentEpoch += doctor.slotDuration * 60000;
    }

    return slots;
  }, [doctor, userTimezone]);

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
      // Filter visible coupons server-side to reduce reads
      const couponsQuery = query(couponsRef, where("tray_visibility", "==", true));
      const querySnapshot = await getDocs(couponsQuery);

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

  // Function to filter and sort available slots — one batch query instead of N per-slot queries
  const getFilteredSlots = useCallback(async (slots: DaySlots["availableSlots"]) => {
    let slotsToProcess = slots || [];

    if (slotsToProcess.length === 0 && doctor?.timeSlots) {
      slotsToProcess = generateDynamicSlots(selectedDay);
    }

    if (slotsToProcess.length === 0) return [];

    const now = new Date();
    const currentTime = now.getTime();

    const slotsWithTimestamps = slotsToProcess.map((slot) => ({
      ...slot,
      calculatedTimestamp:
        slot.bookingDate && slot.bookingDate !== 0
          ? slot.bookingDate
          : calculateSlotTimestamp(selectedDay, slot.time),
    }));

    // Pre-filter: skip already-marked-booked and past slots
    const candidateSlots = slotsWithTimestamps.filter((slot) => {
      if (slot.isBooked === true) return false;
      if (selectedDay === getCurrentDay()) {
        return slot.calculatedTimestamp > currentTime - 10 * 60 * 1000;
      }
      return true;
    });

    if (candidateSlots.length === 0) return [];

    const timestamps = candidateSlots.map((s) => s.calculatedTimestamp);
    let bookedSet: Set<number>;
    try {
      bookedSet = await fetchBookedTimestamps(params.id as string, timestamps);
    } catch (error) {
      console.error("Error checking slot availability:", error);
      bookedSet = new Set<number>();
    }

    return candidateSlots
      .filter((slot) => !bookedSet.has(slot.calculatedTimestamp))
      .sort((a, b) => a.calculatedTimestamp - b.calculatedTimestamp);
  }, [selectedDay, doctor, params.id, generateDynamicSlots, calculateSlotTimestamp]);

  useEffect(() => {
    const fetchDoctorAndSlots = async () => {
      const doctorId = params.id as string;

      // Listing pages already fetched the full doctor document. Reuse it after
      // hydration so the profile image request can start immediately instead
      // of waiting for another Firestore round trip. The network read below
      // still refreshes the data and loads the slot subcollection.
      const cachedDoctor = getCachedDoctorById(doctorId) as unknown as Doctor | null;
      if (cachedDoctor) {
        setDoctor(cachedDoctor);
        setLoading(false);
      }

      try {
        // Coupons and the lifetime consultation count are secondary content.
        // Start them in parallel, but never hold the doctor profile or bookable
        // slots behind those slower aggregate queries.
        void Promise.allSettled([
          fetchAvailableCoupons(),
          fetchConsultationCount(),
        ]);

        // The day selector only ever offers the next three days, so reading the
        // whole seven-document subcollection billed four reads per page view
        // that nothing could display. Document IDs are the day keys ("Mon"…).
        const visibleDays = getAvailableDays();

        const [docSnap, slotsSnap] = await Promise.all([
          getDoc(doc(db, "Users", doctorId)),
          getDocs(
            query(
              collection(db, "Users", doctorId, "Available Slots"),
              where(documentId(), "in", visibleDays)
            )
          ),
        ]);

        if (docSnap.exists()) {
          setDoctor(docSnap.data() as Doctor);
        }

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
          // Find the first available day within the three visible booking days.
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const currentDayIndex = days.indexOf(currentDay);

          let foundDay = false;
          // Check the same three-day window shown in the selector.
          for (let i = 0; i < 3; i++) {
            const nextDayIndex = (currentDayIndex + i) % 7;
            const nextDay = days[nextDayIndex];
            if (slotsData[nextDay]?.availableSlots?.length > 0) {
              setSelectedDay(nextDay);
              foundDay = true;
              break;
            }
          }

          // If no slots in the visible window, keep today selected.
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

  // Removed duplicate auth-state coupon fetch — coupons are already fetched in fetchDoctorAndSlots

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

        // 2 + 4 run in parallel: schedule Meet AND save Stream call ID simultaneously
        setBookingStatus("Scheduling your session...");
        const streamCallId = `consultation_${consultationId}`;
        const { updateDoc, doc: firestoreDoc } = await import("firebase/firestore");

        const [meetResult] = await Promise.allSettled([
          // Step 2+3: fetch Meet link then write it
          (async () => {
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
                doctorTimezone: doctor!.timezone || "Asia/Kolkata",
              }),
            });
            if (!meetResponse.ok) return null;
            const meetData = await meetResponse.json();
            const meetLink: string | null = meetData.meetLink || null;
            if (meetLink) {
              await updateDoc(firestoreDoc(db, "Consultations", consultationId), { "extras.meetLink": meetLink });
            }
            return meetLink;
          })(),
          // Step 4: save Stream call ID (independent of Meet)
          updateDoc(firestoreDoc(db, "Consultations", consultationId), { "extras.streamCallId": streamCallId })
            .catch((e) => console.error("Stream call ID save failed (non-fatal):", e)),
        ]);
        console.log(`>>> [BOOKING DEBUG] ${ts()} STEPS 2+4 COMPLETE`, { meetResult: meetResult.status });

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
    return <AppShimmer variant="profile" />;
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
    <div className="mobile-app-shell min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F8FAFC]">

      {/* ── Mobile Top Bar ─────────────────────────────────────────── */}
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
              aria-label="Go back"
            >
              <FaArrowLeft className="text-[11px]" />
            </button>
            <span className="mobile-page-title">Doctor Profile</span>
          </div>
        </div>
      </header>

      {/* ── Desktop Navbar ─────────────────────────────────────────── */}
      <header className="hidden md:block w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <Logo size="md" className="shadow-lg shadow-primary/20 rounded-xl" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Soocher</h1>
          </div>
          <Button variant="flat" size="sm" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium" startContent={<FaArrowLeft className="text-xs" />} onPress={() => router.back()}>Back</Button>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-8 pb-safe-nav md:pb-24">
        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 items-start">
          {/* Main Info Column */}
          <div className="min-w-0 lg:col-span-2 space-y-4 md:space-y-8">
            <Card className="mobile-app-card premium-card overflow-hidden border border-white/80">
              <CardBody className="relative min-w-0 !overflow-visible p-4 md:p-8">
                <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 -translate-x-1/3 translate-y-1/3 rounded-full bg-cyan-100/60 blur-3xl" />
                <div className="relative">
                  <div className="flex flex-row gap-3.5 md:gap-6 items-center text-left">
                    <div className="relative z-10 shrink-0">
                      {doctor.profileImage ? (
                        <div className="relative w-[84px] h-[92px] md:w-32 md:h-36 overflow-hidden rounded-[20px] md:rounded-[28px] ring-2 md:ring-4 ring-white shadow-lg md:shadow-xl bg-white">
                          <RemoteImage
                            src={doctor.profileImage}
                            alt={doctor.name}
                            sizes="(max-width: 768px) 84px, 128px"
                            priority
                            shimmer
                            className="object-cover object-top"
                          />
                        </div>
                      ) : (
                        <Avatar
                          name={doctor.name}
                          className="w-[84px] h-[92px] md:w-32 md:h-36 text-xl md:text-4xl font-bold rounded-[20px] md:rounded-[28px] ring-2 md:ring-4 ring-white shadow-lg md:shadow-xl bg-primary/10 text-primary"
                        />
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 md:w-7 md:h-7 rounded-full border-[3px] border-white flex items-center justify-center shadow-lg">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2 md:space-y-3 w-full">
                      <div className="flex flex-col items-start gap-1.5 md:gap-2">
                        <Chip size="sm" color="success" variant="flat" className="h-6 bg-emerald-50 text-[9px] md:text-xs text-emerald-700 font-extrabold border border-emerald-100">
                          Verified specialist
                        </Chip>
                        <h1 className="line-clamp-2 text-lg md:text-3xl font-black text-slate-900 leading-tight tracking-tight">
                          {doctor.specialization?.toLowerCase().includes("psycho")
                            ? doctor.name
                            : `Dr. ${doctor.name}`}
                        </h1>
                      </div>
                      <div className="space-y-1 text-slate-500 font-semibold text-[10px] md:text-sm">
                        <div className="flex min-w-0 items-center gap-1.5 md:gap-2 text-primary">
                          <FaUserMd className="text-primary/70" />
                          <span className="truncate">{doctor.specialization}</span>
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                          <FaMapMarkerAlt className="shrink-0 text-slate-400" />
                          <span className="truncate">{doctor.currentCity}, {doctor.currentState}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/90 bg-white/55 shadow-sm backdrop-blur-xl">
                    <div className="px-2 py-3 text-center md:py-4">
                      <p className="flex items-center justify-center gap-1 text-sm md:text-xl font-black text-slate-900"><FaStar className="text-[10px] md:text-sm text-amber-400" />{(doctor.averageRating ?? 0).toFixed(1)}</p>
                      <p className="mt-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">Rating</p>
                    </div>
                    <div className="border-x border-slate-100 px-2 py-3 text-center md:py-4">
                      <p className="text-sm md:text-xl font-black text-slate-900">{formatCountWithPlus(doctor.numExp)}</p>
                      <p className="mt-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">Years</p>
                    </div>
                    <div className="px-2 py-3 text-center md:py-4">
                      <p className="text-sm md:text-xl font-black text-primary">{formatCountWithPlus(consultationCount)}</p>
                      <p className="mt-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">Consults</p>
                    </div>
                  </div>

                  <div className="mt-5 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                    <div className="space-y-5 md:space-y-6">
                      <div className="space-y-1.5 md:space-y-3">
                        <h2 className="text-sm md:text-lg font-black md:font-bold text-slate-900">About</h2>
                        <p className="text-xs md:text-base text-slate-600 leading-relaxed line-clamp-4 md:line-clamp-none">
                          {doctor.aboutMe || "A highly dedicated and experienced medical professional committed to providing exceptional healthcare and personalized treatment plans for every patient."}
                        </p>
                      </div>

                      <div className="space-y-2 md:space-y-3">
                        <h2 className="text-sm md:text-lg font-black md:font-bold text-slate-900">Practice details</h2>
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3 bg-white/55 p-2.5 md:p-4 rounded-2xl border border-white/90 shadow-sm">
                          <div className="flex min-w-0 items-center gap-2 md:gap-4 text-slate-700">
                            <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-primary/5 md:bg-white flex items-center justify-center text-primary shadow-sm">
                              <FaHospital />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] md:text-xs text-slate-400 font-bold uppercase">Clinic</p>
                              <p className="truncate text-[10px] md:text-base font-semibold">{doctor.worksAt || "Private Practice"}</p>
                            </div>
                          </div>
                          <div className="flex min-w-0 items-center gap-2 md:gap-4 text-slate-700">
                            <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-primary/5 md:bg-white flex items-center justify-center text-primary shadow-sm">
                              <FaMapMarkerAlt />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] md:text-xs text-slate-400 font-bold uppercase">Location</p>
                              <p className="truncate text-[10px] md:text-base font-semibold">{doctor.currentCity}, {doctor.currentState}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 md:space-y-8">
                      <div className="space-y-2 md:space-y-4">
                        <h2 className="text-sm md:text-lg font-black md:font-bold text-slate-900">Languages</h2>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {(doctor.knownLanguages?.length ? doctor.knownLanguages : ["English", "Hindi"]).map((language, idx) => (
                            <Chip
                              key={idx}
                              variant="flat"
                              className="h-7 md:h-auto bg-primary/5 text-primary border-none px-2 md:px-4 text-[10px] md:text-sm font-semibold"
                              startContent={<FaLanguage className="text-xs opacity-60" />}
                            >
                              {language}
                            </Chip>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Booking Column */}
          <div className="min-w-0 lg:col-span-1 border-none">
            <Card className="mobile-app-card premium-card md:sticky md:top-28 overflow-hidden border border-white/80 md:border-primary/10">
              <CardBody className="min-w-0 overflow-x-hidden p-4 md:p-6">
                <div className="flex items-center justify-between gap-3 mb-5 md:mb-6">
                  <div>
                    <p className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Online consultation</p>
                    <h2 className="mt-1 text-lg md:text-xl font-black text-slate-900 tracking-tight">Book appointment</h2>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-primary/5 px-3 py-2 text-right">
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fee</p>
                    <div className="flex flex-col items-end">
                      {couponDiscount > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 line-through">
                          ₹{doctor?.consultationFees ? Number(doctor.consultationFees) + 50 : 0}
                        </span>
                      )}
                      <p className="text-lg md:text-xl leading-none font-black text-primary">
                        ₹{doctor?.consultationFees ? (Number(doctor.consultationFees) + 50 - couponDiscount) : 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 md:space-y-6">
                  {/* Day Selection */}
                  <div className="space-y-2 md:space-y-4">
                    <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">1. Select date</label>
                    {getAvailableDays().length > 0 ? (
                      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100/80 p-1.5">
                        {getAvailableDays().map((day, index) => {
                          const isSelected = selectedDay === day;
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setSelectedDay(day);
                                setSelectedSlot("");
                              }}
                              className={`min-w-0 rounded-xl px-1.5 py-2 text-center transition-all ${isSelected
                                ? "bg-white text-primary shadow-sm ring-1 ring-white"
                                : "text-slate-500 hover:bg-white/50"
                                }`}
                            >
                              <span className="block truncate text-[10px] md:text-xs font-extrabold">{formatDayLabel(day)}</span>
                              <span className={`mt-0.5 block text-[9px] md:text-[10px] font-semibold ${isSelected ? "text-primary/70" : "text-slate-400"}`}>{formatDateLabel(index)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-amber-700 text-xs font-medium">No booking slots currently configured.</p>
                      </div>
                    )}
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-2 md:space-y-4">
                    <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">2. Select time</label>
                    {selectedDay && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 md:grid-cols-2 gap-2 md:gap-3 max-h-[220px] md:max-h-[300px] pr-1 md:pr-2 overflow-y-auto custom-scrollbar">
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
                                    flex min-h-10 flex-col items-center justify-center p-2 md:p-3 rounded-xl border transition-all duration-200
                                    ${isBooked ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100' :
                                      isSelected ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' :
                                        'bg-white/75 border-white hover:border-primary/30 text-slate-600 shadow-sm'}
                                  `}
                                >
                                  <span className={`hidden md:block text-xs font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>Session</span>
                                  <span className="text-xs md:text-sm font-black">{slot.time.split(' - ')[0]}</span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="col-span-full py-8 md:py-12 text-center bg-slate-50 rounded-2xl md:rounded-[32px] border-2 border-dashed border-slate-200">
                              <FaClock className="mx-auto text-3xl text-slate-300 mb-3" />
                              <p className="text-slate-400 text-sm font-medium">No available slots</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coupon Section */}
                  <div className="space-y-2 md:space-y-4">
                    <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">3. Coupon</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={couponCode}
                        onValueChange={setCouponCode}
                        variant="flat"
                        className="flex-1"
                        classNames={{
                          inputWrapper: "bg-white/60 md:bg-slate-50 border border-white/80 md:border-slate-100 rounded-xl h-10 md:h-12"
                        }}
                        isDisabled={!!appliedCoupon}
                      />
                      {appliedCoupon ? (
                        <Button
                          color="danger"
                          variant="flat"
                          className="rounded-xl h-10 md:h-12 font-bold"
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
                          className="rounded-xl h-10 md:h-12 font-bold"
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
                        <div className="grid min-w-0 grid-cols-2 gap-2">
                          {availableCoupons.map((coupon) => (
                            <div
                              key={coupon.id}
                              onClick={() => {
                                setCouponCode(coupon.couponCode);
                                // Trigger apply automatically or let user click Apply
                              }}
                              className="min-w-0 cursor-pointer overflow-hidden p-2.5 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                            >
                              <p className="truncate text-xs font-black text-primary">{coupon.couponCode}</p>
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
                  <div className="pt-1 md:pt-4 space-y-3 md:space-y-4">
                    {/* Final Price Summary */}
                    <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-primary/10 to-blue-50/80 rounded-2xl border border-primary/10">
                      <span className="text-xs md:text-sm font-bold text-slate-700">Total payable</span>
                      <span className="text-xl md:text-2xl font-black text-primary">
                        ₹{doctor?.consultationFees ? (Number(doctor.consultationFees) + 50 - couponDiscount) : 0}
                      </span>
                    </div>

                    <Button
                      color="primary"
                      className="w-full rounded-2xl md:rounded-[24px] h-12 md:h-16 text-sm md:text-lg font-black shadow-[0_14px_30px_rgba(46,109,212,0.24)] md:shadow-[0_20px_40px_rgba(46,109,212,0.3)] disabled:opacity-50 disabled:shadow-none"
                      isDisabled={!selectedSlot}
                      onPress={handleBookingClick}
                    >
                      Confirm appointment
                    </Button>
                    <div className="mt-3 md:mt-6 space-y-2 md:space-y-3 bg-white/55 md:bg-slate-50 p-3 md:p-4 rounded-2xl border border-white/80 md:border-slate-100">
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

export default function DoctorDetails() {
  return (
    <UserTimezoneProvider>
      <DoctorDetailsContent />
    </UserTimezoneProvider>
  );
}
