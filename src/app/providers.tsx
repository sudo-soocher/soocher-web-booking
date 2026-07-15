"use client";

import React from "react";
import { NextUIProvider } from "@nextui-org/react";
import { StreamChatProvider } from "@/components/chat/StreamChatContext";
import { UserTimezoneProvider } from "@/hooks/useUserTimezone";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserTimezoneProvider>
      <StreamChatProvider>
        <NextUIProvider>
          {children}
        </NextUIProvider>
      </StreamChatProvider>
    </UserTimezoneProvider>
  );
}
