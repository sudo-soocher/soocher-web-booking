"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { StreamChat } from "stream-chat";

interface StreamChatContextType {
  client: StreamChat | null;
  connectUser: (userId: string, userName: string) => Promise<void>;
  disconnectUser: () => Promise<void>;
  sanitizeId: (id: string) => string;
}

/**
 * Stream user IDs must match `^[a-zA-Z0-9_-]+$`. Firebase UIDs already satisfy
 * this, but any other ID source (email, phone) needs to be sanitized first.
 */
const sanitizeStreamId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_");

const StreamChatContext = createContext<StreamChatContextType | undefined>(undefined);

export const useStreamChat = () => {
  const context = useContext(StreamChatContext);
  if (!context) {
    throw new Error("useStreamChat must be used within a StreamChatProvider");
  }
  return context;
};

export const StreamChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    if (!apiKey) {
      console.warn("NEXT_PUBLIC_STREAM_API_KEY is missing — chat will not initialize.");
      return;
    }
    const chatClient = StreamChat.getInstance(apiKey);
    setClient(chatClient);

    return () => {
      chatClient.disconnectUser();
    };
  }, []);

  const connectUser = useCallback(
    async (userId: string, userName: string) => {
      if (!client) {
        console.error("Stream client not initialized");
        return;
      }

      const sanitizedUserId = sanitizeStreamId(userId);

      // Already connected with the same id — nothing to do.
      if (client.userID === sanitizedUserId) return;

      // Stream allows only one connected user per client instance. Disconnect
      // the previous user (e.g. on account switch) before connecting the new one.
      if (client.userID) {
        await client.disconnectUser();
      }

      const tokenApi = process.env.NEXT_PUBLIC_STREAM_TOKEN_API || "/api/stream-token";
      const fetchUrl =
        typeof window !== "undefined" && tokenApi.startsWith("/")
          ? `${window.location.origin}${tokenApi}`
          : tokenApi;

      const response = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: sanitizedUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Token API error (${response.status}): ${errorData.message || response.statusText}`
        );
      }

      const data = await response.json();
      const token = data.token;
      if (!token) throw new Error("Token API did not return a token");

      await client.connectUser({ id: sanitizedUserId, name: userName }, token);
    },
    [client]
  );

  const disconnectUser = useCallback(async () => {
    if (client) await client.disconnectUser();
  }, [client]);

  return (
    <StreamChatContext.Provider
      value={{ client, connectUser, disconnectUser, sanitizeId: sanitizeStreamId }}
    >
      {children}
    </StreamChatContext.Provider>
  );
};
