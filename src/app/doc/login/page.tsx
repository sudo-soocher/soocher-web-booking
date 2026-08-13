import { redirect } from "next/navigation";

/**
 * The doctor login screen is gone — login is unified at /login, which routes by
 * account type once the session exists.
 *
 * This route stays as a permanent redirect so existing doctor bookmarks, and
 * anything in the Flutter doctor app still pointing here, keep working.
 *
 * `?as=doctor` preserves signup intent: a phone number nobody has seen before
 * is ambiguous, so the unified screen needs to be told this person is
 * registering as a doctor.
 */
export default function DoctorLoginRedirect() {
  redirect("/login?as=doctor");
}
