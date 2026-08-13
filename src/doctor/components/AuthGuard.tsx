"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/doctor/lib/auth";
import { PageLoader } from "@/doctor/components/ui/PageLoader";

/**
 * Wrap any authenticated route in this component.
 * Routes by doctor status:
 *  - no user                     → /login?as=doctor
 *  - status "not-a-doctor"       → signed out, then /login?denied=1
 *  - status "new" / "onboarding" → /doc/onboarding (still finishing the flow)
 *  - status "pending"            → allowed into the app; pages show a banner
 *  - status "verified"           → render children
 *
 * The "not-a-doctor" branch is what makes /doc doctor-only. The patient and
 * doctor apps share one Firebase Auth session and one origin, so a signed-in
 * patient reaches these routes already authenticated. Being signed in is
 * therefore not sufficient — the account must actually be a DOCTOR.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, status, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?as=doctor");
      return;
    }
    if (status === "not-a-doctor") {
      // Drop the patient session before showing the doctor login, otherwise the
      // guard would bounce them straight back here on the next render.
      void signOut().finally(() => router.replace("/login?denied=1"));
      return;
    }
    if ((status === "new" || status === "onboarding") && !pathname?.startsWith("/doc/onboarding")) {
      router.replace("/doc/onboarding");
    }
  }, [user, status, loading, pathname, router, signOut]);

  if (
    loading ||
    !user ||
    status === "not-a-doctor" ||
    status === "new" ||
    status === "onboarding"
  ) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
