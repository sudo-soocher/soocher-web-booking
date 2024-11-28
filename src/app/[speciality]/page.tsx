"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, Image, Avatar, Skeleton } from "@nextui-org/react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  FaStar,
  FaLanguage,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaUserMd,
  FaStethoscope,
} from "react-icons/fa";

interface Doctor {
  id: string;
  name: string;
  profileImage: string;
  aboutMe: string;
  worksAt: string;
  numExp: number;
  currentState: string;
  currentCity: string;
  consultationFees: number;
  averageRating: number;
  knownLanguages: string[];
  specialization: string;
}

export default function SpecialityPage() {
  const params = useParams();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const getDecodedSpeciality = () => {
    const speciality = params.speciality as string;
    const decoded = decodeURIComponent(speciality);
    return decoded.replace(/%20/g, " ");
  };

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const doctorsRef = collection(db, "Users");
        const decodedSpeciality = getDecodedSpeciality();

        const q = query(
          doctorsRef,
          where("specialization", "==", decodedSpeciality),
          where("isAccountVerified", "==", true)
        );

        const querySnapshot = await getDocs(q);
        const doctorsList: Doctor[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Doctor, "id">;
          doctorsList.push({
            id: doc.id,
            ...data,
          });
        });

        setDoctors(doctorsList);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.speciality) {
      fetchDoctors();
    }
  }, [params.speciality]);

  const capitalizeFirstLetter = (string: string) => {
    return string
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-primary/10 py-20">
        <div className="absolute top-4 left-4 md:left-8">
          <h1
            className="text-2xl font-bold text-primary cursor-pointer"
            onClick={() => router.push("/")}
          >
            Soocher
          </h1>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/20 rounded-full">
                <FaStethoscope className="text-4xl text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {capitalizeFirstLetter(getDecodedSpeciality())}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find the best {getDecodedSpeciality()} specialists for your health
              needs
            </p>
          </div>
        </div>
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-96 h-96 bg-primary/5 rounded-full"></div>
          <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-primary/5 rounded-full"></div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-12 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">
                {doctors.length}
              </div>
              <div className="text-gray-600">Available Doctors</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">
                {getDecodedSpeciality().toLowerCase().includes("psycho")
                  ? "50 mins"
                  : "15 mins"}
              </div>
              <div className="text-gray-600">Consultation Duration</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-gray-600">Available Support</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">100%</div>
              <div className="text-gray-600">Verified Doctors</div>
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Section */}
      <main className="flex-1 bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">
            Available {capitalizeFirstLetter(getDecodedSpeciality())}{" "}
            Specialists
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <Card
                key={doctor.id}
                isPressable
                isHoverable
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                onPress={() => router.push(`/doctor/${doctor.id}`)}
              >
                <CardBody className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative z-0">
                      {doctor.profileImage ? (
                        <Image
                          src={doctor.profileImage}
                          alt={doctor.name}
                          className="w-24 h-24 rounded-xl object-cover shadow-md"
                        />
                      ) : (
                        <Avatar
                          name={doctor.name}
                          className="w-24 h-24 text-large rounded-xl shadow-md bg-primary/10"
                          classNames={{
                            name: "text-xl font-semibold",
                          }}
                        />
                      )}
                      <div className="absolute -bottom-3 -right-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg z-10">
                        ₹
                        {doctor.consultationFees
                          ? Number(doctor.consultationFees) + 50
                          : 0}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-black/90">
                        {doctor.specialization?.toLowerCase().includes("psycho")
                          ? doctor.name
                          : `Dr. ${doctor.name}`}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <FaStar className="text-yellow-400" />
                        <span>{doctor.averageRating.toFixed(1)}</span>
                        <span className="mx-2">•</span>
                        <span>{doctor.numExp} years exp.</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <FaMapMarkerAlt className="text-gray-400" />
                        <span>
                          {doctor.currentCity}, {doctor.currentState}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(doctor.knownLanguages?.length
                          ? doctor.knownLanguages.slice(0, 2)
                          : ["English"]
                        ).map((language, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 text-sm text-gray-600"
                          >
                            <FaLanguage className="text-gray-400" />
                            <span>{language}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="min-h-screen p-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="w-full">
          <CardBody className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="rounded-xl w-24 h-24" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  </div>
);
