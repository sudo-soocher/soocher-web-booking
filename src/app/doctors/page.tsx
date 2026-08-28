import DoctorsClient from "./DoctorsClient";
import { fetchSpecialitiesServer } from "@/lib/specialities-server";
import { fetchDoctorsBySpecialityServer } from "@/lib/doctors-server";

const DEFAULT_SPECIALITY = "Physical Medicine and Rehabilitation";

export default async function DoctorsListPage({
  searchParams,
}: {
  searchParams: Promise<{ speciality?: string }>;
}) {
  const params = await searchParams;
  const speciality = params.speciality || DEFAULT_SPECIALITY;

  const [specialities, doctors] = await Promise.all([
    fetchSpecialitiesServer(),
    fetchDoctorsBySpecialityServer(speciality),
  ]);

  return (
    <DoctorsClient
      initialSpeciality={speciality}
      initialSpecialities={specialities.map((s) => s.name)}
      initialDoctors={doctors}
    />
  );
}
