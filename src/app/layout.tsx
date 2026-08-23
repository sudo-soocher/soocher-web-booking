import React from "react";
import { Providers } from "./providers";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Noto_Sans_Malayalam } from "next/font/google";

// Applied only under html[lang="ml"] (see globals.css). Android and iOS ship
// Malayalam glyphs, but desktop Windows often does not and renders empty boxes.
const notoMalayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-malayalam",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f7fb",
};

export const metadata: Metadata = {
  title: "Soocher",
  description: "Book your doctor's appointment with Soocher",
  icons: {
    icon: "/soocherlogo.jpg",
    apple: "/soocherlogo.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Soocher",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`light ${notoMalayalam.variable}`}>
      <body className="min-h-screen bg-background">
        <Providers>
          {children}
          <MobileBottomNav />
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
