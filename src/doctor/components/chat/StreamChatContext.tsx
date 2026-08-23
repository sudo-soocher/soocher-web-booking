"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StreamChat } from "stream-chat";
import { useAuth } from "@/doctor/lib/auth";

interface StreamChatContextType {
  client: StreamChat | null;
  connectUser: (userId: string, userName: string) => Promise<void>;
  disconnectUser: () => Promise<void>;
  sanitizeId: (id: string) => string;
  unreadCount: number;
  unreadByChannel: Record<string, number>;
  getDirectUnreadCount: (otherUserId: string) => number;
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
  const { user, profile } = useAuth();
  const [client, setClient] = useState<StreamChat | null>(null);
  const [connectedUserId, setConnectedUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [unreadByMember, setUnreadByMember] = useState<Record<string, number>>({});
  const connectingRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);

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
      if (client.userID === sanitizedUserId) {
        setConnectedUserId(sanitizedUserId);
        return;
      }

      // The app shell and a newly opened drawer can request the same connection
      // during the same render. Share that in-flight request so Stream never
      // receives two simultaneous connectUser calls for one client.
      if (connectingRef.current?.userId === sanitizedUserId) {
        await connectingRef.current.promise;
        return;
      }
      if (connectingRef.current) await connectingRef.current.promise;
      if (client.userID === sanitizedUserId) {
        setConnectedUserId(sanitizedUserId);
        return;
      }

      const connection = (async () => {
        // Stream allows only one connected user per client instance. Disconnect
        // the previous user (e.g. on account switch) before connecting the new one.
        if (client.userID) await client.disconnectUser();

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
        setConnectedUserId(sanitizedUserId);
      })();

      connectingRef.current = { userId: sanitizedUserId, promise: connection };
      try {
        await connection;
      } finally {
        if (connectingRef.current?.promise === connection) connectingRef.current = null;
      }
    },
    [client]
  );

  const disconnectUser = useCallback(async () => {
    if (client) await client.disconnectUser();
    setConnectedUserId(null);
    setUnreadCount(0);
    setUnreadByChannel({});
    setUnreadByMember({});
  }, [client]);

  // Keep the doctor connected for the lifetime of the authenticated app, not
  // only while an individual chat drawer is open. This is what lets the nav
  // badge receive new-message events in real time on every doctor page.
  useEffect(() => {
    if (!client || !user) return;
    const doctorName =
      (typeof profile?.name === "string" && profile.name) || user.displayName || "Doctor";
    void connectUser(user.uid, doctorName).catch((error) => {
      console.error("Failed to connect doctor chat notifications:", error);
    });
  }, [client, user, profile?.name, connectUser]);

  const refreshUnread = useCallback(async () => {
    if (!client || !connectedUserId) return;
    try {
      const result = await client.getUnreadCount();
      setUnreadCount(result.total_unread_count || 0);
      setUnreadByChannel(
        Object.fromEntries(
          result.channels.map((channel) => [channel.channel_id, channel.unread_count])
        )
      );

      const unreadChannels = result.channels.filter((channel) => channel.unread_count > 0);
      if (unreadChannels.length === 0) {
        setUnreadByMember({});
        return;
      }

      const unreadById = new Map(
        unreadChannels.map((channel) => [channel.channel_id, channel.unread_count])
      );
      const channels = await client.queryChannels(
        { cid: { $in: unreadChannels.map((channel) => `messaging:${channel.channel_id}`) } },
        {},
        { state: true, watch: false, limit: 100, message_limit: 0 }
      );
      const memberCounts: Record<string, number> = {};
      channels.forEach((channel) => {
        const count = unreadById.get(channel.id || "") || 0;
        Object.keys(channel.state.members)
          .filter((memberId) => memberId !== connectedUserId)
          .forEach((memberId) => {
            memberCounts[memberId] = (memberCounts[memberId] || 0) + count;
          });
      });
      setUnreadByMember(memberCounts);
    } catch (error) {
      console.error("Failed to refresh unread messages:", error);
    }
  }, [client, connectedUserId]);

  useEffect(() => {
    if (!client || !connectedUserId) return;

    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshUnread(), 120);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };

    void refreshUnread();
    const subscriptions = [
      client.on("message.new", scheduleRefresh),
      client.on("notification.message_new", scheduleRefresh),
      client.on("message.read", scheduleRefresh),
      client.on("notification.mark_read", scheduleRefresh),
    ];
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(refreshTimer);
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [client, connectedUserId, refreshUnread]);

  const getDirectUnreadCount = useCallback(
    (otherUserId: string) => unreadByMember[sanitizeStreamId(otherUserId)] || 0,
    [unreadByMember]
  );

  const value = useMemo<StreamChatContextType>(
    () => ({
      client,
      connectUser,
      disconnectUser,
      sanitizeId: sanitizeStreamId,
      unreadCount,
      unreadByChannel,
      getDirectUnreadCount,
    }),
    [
      client,
      connectUser,
      disconnectUser,
      unreadCount,
      unreadByChannel,
      getDirectUnreadCount,
    ]
  );

  return (
    <StreamChatContext.Provider value={value}>
      {children}
    </StreamChatContext.Provider>
  );
};
