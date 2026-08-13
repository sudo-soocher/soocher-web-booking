"use client";

import React from "react";
import { HeroUIProvider } from "@heroui/react";
import { StreamChatProvider } from "@/components/chat/StreamChatContext";
import { LanguageProvider } from "@/i18n/LanguageProvider";
// Side-effect import: starts App Check once for the whole app (patient + doctor).
import "@/lib/firebase-appcheck";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <StreamChatProvider>
        <HeroUIProvider>
          {children}
        </HeroUIProvider>
      </StreamChatProvider>
    </LanguageProvider>
  );
}
