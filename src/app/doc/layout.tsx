import React from "react";
import type { Metadata, Viewport } from "next";
import { Providers as DoctorProviders } from "./providers";
import { DoctorShellClass } from "./DoctorShellClass";
import "@/doctor/globals.doctor.css";

/**
 * Nested layout for the doctor app at /doc/*.
 *
 * This was the doctor app's ROOT layout and rendered its own <html>/<body>.
 * Those are owned by src/app/layout.tsx now, so only the provider stack and the
 * doctor-specific metadata survive the move. The doctor CSS is imported here so
 * its mobile scroll-lock rules load with these routes.
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Soocher for Doctors",
  description: "Manage your practice, appointments, and patients with Soocher.",
};

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DoctorProviders>
      <DoctorShellClass />
      {children}
    </DoctorProviders>
  );
}
