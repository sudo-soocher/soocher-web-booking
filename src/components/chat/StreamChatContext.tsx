"use client";

// stream-chat is NOT imported at the top — it is lazily loaded on first chat use
// This removes ~200KB from the global bundle for every page that never uses chat.

import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

const sanitizeStreamId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');

interface StreamChatContextType {
    client: any | null;
    connectUser: (userId: string, userName: string) => Promise<void>;
    disconnectUser: () => Promise<void>;
    sanitizeId: (id: string) => string;
}

const StreamChatContext = createContext<StreamChatContextType | undefined>(undefined);

export const useStreamChat = () => {
    const context = useContext(StreamChatContext);
    if (!context) throw new Error('useStreamChat must be used within a StreamChatProvider');
    return context;
};

export const StreamChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [client, setClient] = useState<any>(null);
    const clientRef = useRef<any>(null);

    // Lazily create the StreamChat instance — only downloads the SDK when chat is first opened
    const getOrInitClient = useCallback(async () => {
        if (clientRef.current) return clientRef.current;
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
        if (!apiKey) { console.warn('NEXT_PUBLIC_STREAM_API_KEY is missing'); return null; }
        const { StreamChat } = await import('stream-chat');
        const chatClient = StreamChat.getInstance(apiKey);
        clientRef.current = chatClient;
        setClient(chatClient);
        return chatClient;
    }, []);

    const connectUser = useCallback(async (userId: string, userName: string) => {
        const chatClient = await getOrInitClient();
        if (!chatClient) { console.error('Stream client not initialized'); return; }

        const sanitizedUserId = sanitizeStreamId(userId);
        if (chatClient.userID === sanitizedUserId) return;
        if (chatClient.userID) await chatClient.disconnectUser();

        const tokenApi = process.env.NEXT_PUBLIC_STREAM_TOKEN_API;
        if (!tokenApi) throw new Error('NEXT_PUBLIC_STREAM_TOKEN_API is not defined');

        const fetchUrl = (typeof window !== 'undefined' && tokenApi.startsWith('/'))
            ? `${window.location.origin}${tokenApi}`
            : tokenApi;

        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: sanitizedUserId }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Token API error (${response.status}): ${err.message || response.statusText}`);
        }
        const { token } = await response.json();
        if (!token) throw new Error('Token API did not return a token');
        await chatClient.connectUser({ id: sanitizedUserId, name: userName }, token);
    }, [getOrInitClient]);

    const disconnectUser = useCallback(async () => {
        if (clientRef.current) await clientRef.current.disconnectUser();
    }, []);

    return (
        <StreamChatContext.Provider value={{ client, connectUser, disconnectUser, sanitizeId: sanitizeStreamId }}>
            {children}
        </StreamChatContext.Provider>
    );
};
