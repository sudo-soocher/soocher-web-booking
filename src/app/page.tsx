import HomeClient from "./HomeClient";
import { fetchSpecialitiesServer } from "@/lib/specialities-server";

// Revalidated periodically rather than on every request — the speciality
// list changes rarely, and this keeps the home page fast without hitting
// Firestore on every single page load.
export const revalidate = 300;

export default async function Home() {
  const initialSpecialities = await fetchSpecialitiesServer();
  return <HomeClient initialSpecialities={initialSpecialities} />;
}
