"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';

interface StreamChatContextType {
    client: StreamChat | null;
    connectUser: (userId: string, userName: string) => Promise<void>;
    disconnectUser: () => Promise<void>;
    sanitizeId: (id: string) => string;
}

const sanitizeStreamId = (id: string) => id.replace(/[^a-zA-Z0-9_\-]/g, '_');

const StreamChatContext = createContext<StreamChatContextType | undefined>(undefined);

export const useStreamChat = () => {
    const context = useContext(StreamChatContext);
    if (!context) {
        throw new Error('useStreamChat must be used within a StreamChatProvider');
    }
    return context;
};

export const StreamChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [client, setClient] = useState<StreamChat | null>(null);

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
        if (!apiKey) {
            console.warn('NEXT_PUBLIC_STREAM_API_KEY is missing');
            return;
        }
        const chatClient = StreamChat.getInstance(apiKey);
        setClient(chatClient);

        return () => {
            chatClient.disconnectUser();
        };
    }, []);

    const connectUser = React.useCallback(async (userId: string, userName: string) => {
        if (!client) {
            console.error('Stream client not initialized');
            return;
        }

        const sanitizedUserId = sanitizeStreamId(userId);

        // If user is already connected with the same ID, don't reconnect
        if (client.userID === sanitizedUserId) {
            return;
        }

        // Stream allows only one connected user per client instance
        if (client.userID) {
            console.log('Disconnecting current user:', client.userID);
            await client.disconnectUser();
        }

        const tokenApi = process.env.NEXT_PUBLIC_STREAM_TOKEN_API;

        try {
            if (!tokenApi) throw new Error('NEXT_PUBLIC_STREAM_TOKEN_API is not defined');

            console.log('Fetching Stream token for userId:', sanitizedUserId, 'from:', tokenApi);

            // If it's a relative URL, build an absolute one for robustness in some fetch environments
            const fetchUrl = (typeof window !== 'undefined' && tokenApi.startsWith('/'))
                ? `${window.location.origin}${tokenApi}`
                : tokenApi;

            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: sanitizedUserId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Token API error (${response.status}): ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('Token received successfully');
            const token = data.token;

            if (!token) throw new Error('Token API did not return a token');

            console.log('Connecting user to Stream Chat:', sanitizedUserId);
            await client.connectUser(
                {
                    id: sanitizedUserId,
                    name: userName,
                },
                token
            );
            console.log('User connected successfully to Stream Chat');
        } catch (error: any) {
            console.error('Stream Connection Error:', error);
            if (error.message === 'Failed to fetch' && tokenApi?.startsWith('http')) {
                console.warn('Network error detected when hitting external API. This is likely a CORS issue. Please use the local /api/stream-token proxy.');
            }
            throw error;
        }
    }, [client]);

    const disconnectUser = React.useCallback(async () => {
        if (client) {
            await client.disconnectUser();
        }
    }, [client]);

    return (
        <StreamChatContext.Provider value={{ client, connectUser, disconnectUser, sanitizeId: sanitizeStreamId }}>
            {children}
        </StreamChatContext.Provider>
    );
};
