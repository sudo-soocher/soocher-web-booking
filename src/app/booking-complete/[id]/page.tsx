"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardBody, Button, Image } from "@nextui-org/react";
import {
  FaCheckCircle,
  FaDownload,
  FaMobile,
  FaClock,
  FaCalendar,
  FaVideo,
  FaComments,
  FaUser,
  FaUserMd,
} from "react-icons/fa";
import { Consultation } from "@/types/consultation";
import { motion } from "framer-motion";

export default function BookingComplete() {
  const params = useParams();
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        const consultationDoc = await getDoc(
          doc(db, "Consultations", params.id as string)
        );
        if (consultationDoc.exists()) {
          setConsultation(consultationDoc.data() as Consultation);
        }
      } catch (error) {
        console.error("Error fetching consultation:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchConsultation();
    }
  }, [params.id]);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!consultation) {
    return <div>Consultation not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600">
            Your consultation has been successfully scheduled
          </p>
        </motion.div>

        {/* Consultation Ticket */}
        <Card className="mb-8 overflow-hidden">
          <div className="bg-primary text-white py-4 px-6">
            <h2 className="text-xl font-semibold">Consultation Ticket</h2>
            <p className="text-sm opacity-80">#{consultation.consultationId}</p>
          </div>

          <CardBody className="p-6 relative">
            {/* Decorative circles for ticket effect */}
            <div className="absolute -left-4 top-1/2 w-8 h-8 bg-gray-50 rounded-full transform -translate-y-1/2"></div>
            <div className="absolute -right-4 top-1/2 w-8 h-8 bg-gray-50 rounded-full transform -translate-y-1/2"></div>

            {/* Dotted line */}
            <div className="border-t border-dashed border-gray-300 my-4"></div>

            <div className="space-y-6">
              {/* Doctor Info */}
              <div className="flex items-center gap-4">
                <FaUserMd className="text-xl text-primary" />
                <div>
                  <h3 className="font-semibold">Doctor</h3>
                  <p className="text-gray-600">{consultation.doctorName}</p>
                </div>
              </div>

              {/* Patient Info */}
              <div className="flex items-center gap-4">
                <FaUser className="text-xl text-primary" />
                <div>
                  <h3 className="font-semibold">Patient</h3>
                  <p className="text-gray-600">
                    {consultation.extras.patientDetails.patientName}
                  </p>
                  <p className="text-sm text-gray-500">
                    Age: {consultation.extras.patientDetails.patientAge} •
                    Gender: {consultation.extras.patientDetails.gender}
                  </p>
                </div>
              </div>

              {/* Video Consultation Time */}
              <div className="flex items-center gap-4">
                <FaVideo className="text-xl text-primary" />
                <div>
                  <h3 className="font-semibold">Video Consultation</h3>
                  <p className="text-gray-600">
                    {formatDateTime(consultation.consultationTime)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Expires at:{" "}
                    {formatDateTime(consultation.consultationExpiration)}
                  </p>
                </div>
              </div>

              {/* Chat Availability */}
              <div className="flex items-center gap-4">
                <FaComments className="text-xl text-primary" />
                <div>
                  <h3 className="font-semibold">Chat Available Until</h3>
                  <p className="text-gray-600">
                    {formatDateTime(consultation.chatExpiration)}
                  </p>
                </div>
              </div>
            </div>

            {/* Dotted line */}
            <div className="border-t border-dashed border-gray-300 my-4"></div>

            {/* QR Code placeholder */}
            <div className="flex justify-center mt-4">
              <div className="text-center">
                <Image
                  src="/qr-code.png"
                  alt="QR Code"
                  className="w-32 h-32 mx-auto"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Scan to join consultation
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Download App Section */}
        <Card className="bg-primary/5">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Download Soocher App</h2>
                <p className="text-gray-600 mb-4">
                  Get the best experience with our mobile app. Join your
                  consultation, manage appointments, and more.
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaMobile />
                    <span>Easy to use interface</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaDownload />
                    <span>Available for iOS and Android</span>
                  </div>
                </div>
                {/* Store Buttons - Always visible */}
                <div className="flex gap-4 mt-6">
                  <a
                    href="https://apps.apple.com/app/soocher"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-1/2 md:w-auto"
                  >
                    <Image
                      src="/app-store.png"
                      alt="Download on App Store"
                      className="w-full md:w-auto h-12 cursor-pointer"
                    />
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.soocher"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-1/2 md:w-auto"
                  >
                    <Image
                      src="/play-store.png"
                      alt="Get it on Play Store"
                      className="w-full md:w-auto h-12 cursor-pointer"
                    />
                  </a>
                </div>
              </div>
              {/* QR Code - Only visible on desktop */}
              <div className="hidden md:block w-48 h-48">
                <Image
                  src="/qr-code.png"
                  alt="QR Code"
                  className="w-full h-full"
                />
                <p className="text-center text-sm text-gray-600 mt-2">
                  Scan to download
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            color="primary"
            variant="flat"
            onPress={() => router.push("/bookings")}
          >
            View All Bookings
          </Button>
          <Button color="primary" onPress={() => router.push("/")}>
            Book Another Consultation
          </Button>
        </div>
      </div>
    </div>
  );
}
