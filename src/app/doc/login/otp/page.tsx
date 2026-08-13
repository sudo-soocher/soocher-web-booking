import { redirect } from "next/navigation";

/**
 * The doctor OTP step belonged to the Firebase SMS flow, which the unified
 * WhatsApp login replaces. Anyone landing here restarts at /login.
 */
export default function DoctorOtpRedirect() {
  redirect("/login?as=doctor");
}
