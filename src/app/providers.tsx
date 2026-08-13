"use client";

import React from "react";
import { NextUIProvider } from "@nextui-org/react";
import { StreamChatProvider } from "@/components/chat/StreamChatContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StreamChatProvider>
      <NextUIProvider>
        {children}
      </NextUIProvider>
    </StreamChatProvider>
  );
}
