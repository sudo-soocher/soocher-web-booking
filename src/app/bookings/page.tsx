"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  Button,
  Tabs,
  Tab,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@nextui-org/react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import {
  FaVideo,
  FaClock,
  FaUserMd,
  FaCalendar,
  FaArrowLeft,
  FaComments,
  FaUser,
} from "react-icons/fa";
import { Consultation } from "@/types/consultation";
import { motion } from "framer-motion";

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
    transition: { duration: 0.3 },
  },
};

export default function Bookings() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("upcoming");
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const fetchConsultations = async () => {
      if (!auth.currentUser) {
        router.push("/login");
        return;
      }

      try {
        const consultationsRef = collection(db, "Consultations");
        const q = query(
          consultationsRef,
          where("participants", "array-contains", auth.currentUser.uid),
          orderBy("consultationTime", "desc")
        );

        const querySnapshot = await getDocs(q);
        const consultationsList: Consultation[] = [];
        querySnapshot.forEach((doc) => {
          consultationsList.push({
            ...doc.data(),
          } as Consultation);
        });

        setConsultations(consultationsList);
      } catch (error) {
        console.error("Error fetching consultations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, [router]);

  const filterConsultations = (type: "upcoming" | "active" | "past") => {
    const now = Date.now();

    switch (type) {
      case "upcoming":
        return consultations.filter(
          (consultation) => consultation.consultationTime > now
        );
      case "active":
        return consultations.filter(
          (consultation) =>
            consultation.consultationTime <= now &&
            consultation.consultationExpiration >= now
        );
      case "past":
        return consultations.filter(
          (consultation) => consultation.consultationExpiration < now
        );
      default:
        return [];
    }
  };

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

  const getStatusChip = (consultation: Consultation) => {
    const now = Date.now();

    if (consultation.consultationTime > now) {
      return (
        <Chip color="primary" variant="flat">
          Upcoming
        </Chip>
      );
    } else if (consultation.consultationExpiration >= now) {
      return (
        <Chip color="success" variant="flat">
          Active
        </Chip>
      );
    } else {
      return (
        <Chip color="default" variant="flat">
          Completed
        </Chip>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto space-y-4"
        >
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardBody className="h-32 animate-pulse bg-gray-200" />
            </Card>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="light"
            startContent={<FaArrowLeft />}
            onPress={() => router.push("/")}
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Consultations</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            className="mb-8"
          >
            <Tab
              key="upcoming"
              title={
                <div className="flex items-center gap-2">
                  <FaCalendar />
                  <span>Upcoming</span>
                  <Chip size="sm" variant="flat">
                    {filterConsultations("upcoming").length}
                  </Chip>
                </div>
              }
            />
            <Tab
              key="active"
              title={
                <div className="flex items-center gap-2">
                  <FaVideo />
                  <span>Active</span>
                  <Chip size="sm" variant="flat">
                    {filterConsultations("active").length}
                  </Chip>
                </div>
              }
            />
            <Tab
              key="past"
              title={
                <div className="flex items-center gap-2">
                  <FaClock />
                  <span>Past</span>
                  <Chip size="sm" variant="flat">
                    {filterConsultations("past").length}
                  </Chip>
                </div>
              }
            />
          </Tabs>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {filterConsultations(
            selectedTab as "upcoming" | "active" | "past"
          ).map((consultation) => (
            <motion.div
              key={consultation.consultationId}
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card
                isPressable
                className="hover:shadow-md transition-shadow"
                onPress={() => {
                  setSelectedConsultation(consultation);
                  onOpen();
                }}
              >
                <CardBody className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <FaUserMd className="text-xl text-primary mt-1" />
                        <div>
                          <h3 className="font-semibold text-lg">
                            {consultation.doctorName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Patient:{" "}
                            {consultation.extras.patientDetails.patientName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <FaCalendar className="text-xl text-primary mt-1" />
                        <div>
                          <h4 className="font-medium">Consultation Time</h4>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(consultation.consultationTime)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 items-end">
                      {getStatusChip(consultation)}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}

          {filterConsultations(selectedTab as "upcoming" | "active" | "past")
            .length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FaClock className="text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No {selectedTab} consultations found
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Consultation Details Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Consultation Details
              </ModalHeader>
              <ModalBody className="p-6">
                {selectedConsultation && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <FaUserMd className="text-xl text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold">Doctor</h3>
                        <p className="text-gray-600">
                          {selectedConsultation.doctorName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <FaUser className="text-xl text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold">Patient</h3>
                        <p className="text-gray-600">
                          {
                            selectedConsultation.extras.patientDetails
                              .patientName
                          }
                        </p>
                        <p className="text-sm text-gray-500">
                          Age:{" "}
                          {
                            selectedConsultation.extras.patientDetails
                              .patientAge
                          }{" "}
                          • Gender:{" "}
                          {selectedConsultation.extras.patientDetails.gender}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <FaVideo className="text-xl text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold">Video Consultation</h3>
                        <p className="text-gray-600">
                          {formatDateTime(
                            selectedConsultation.consultationTime
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires at:{" "}
                          {formatDateTime(
                            selectedConsultation.consultationExpiration
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <FaComments className="text-xl text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold">Chat Available Until</h3>
                        <p className="text-gray-600">
                          {formatDateTime(selectedConsultation.chatExpiration)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
