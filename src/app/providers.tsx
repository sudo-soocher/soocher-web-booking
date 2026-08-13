"use client";

import React from "react";
import { NextUIProvider } from "@nextui-org/react";
import { StreamChatProvider } from "@/components/chat/StreamChatContext";
import { LanguageProvider } from "@/i18n/LanguageProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <StreamChatProvider>
        <NextUIProvider>
          {children}
        </NextUIProvider>
      </StreamChatProvider>
    </LanguageProvider>
  );
}
