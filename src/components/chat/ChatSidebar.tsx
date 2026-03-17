"use client";

import React, { useEffect, useState } from 'react';
import {
    Chat,
    Channel,
    ChannelHeader,
    MessageList,
    MessageInput,
    Thread,
    LoadingIndicator,
} from 'stream-chat-react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'stream-chat-react/dist/css/v2/index.css';
import { Button } from '@nextui-org/react';
import { useStreamChat } from './StreamChatContext';
import { Consultation } from '@/types/consultation';
import { auth } from '@/lib/firebase';
import { FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    consultation: Consultation;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, consultation }) => {
    const { client, connectUser, sanitizeId } = useStreamChat();
    const [channel, setChannel] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const initChat = React.useCallback(async () => {
        if (!client || !isOpen) return;

        setLoading(true);
        setError(null);
        try {
            if (!auth.currentUser) throw new Error('No authenticated user found');

            const uid = auth.currentUser.uid;
            const name = auth.currentUser.displayName || 'Patient';

            console.log('Attempting to connect Stream user:', uid);
            await connectUser(uid, name);

            if (!client.userID) {
                throw new Error('Stream client failed to connect user');
            }

            console.log('Stream user connected, setting up channel...');

            // Standardized channel ID: consultation_<CONSULTATION_ID>
            const channelId = `consultation_${sanitizeId(consultation.consultationId)}`;

            // Flutter Flow: Phase B - Find or Create
            // members: patientUID, doctorUID
            const rawMembers = [uid, ...(consultation.participants || [])];
            const members = Array.from(new Set(rawMembers))
                .filter(id => id && id.trim() !== '')
                .map(id => sanitizeId(id));

            console.log('Finalizing Channel Config - ID:', channelId, 'Members:', members);

            // Fetch doctor avatar if available? (Consultation type doesn't have it directly, but we can add what we have)
            const newChannel = client.channel('messaging', channelId, {
                name: `Consultation with ${consultation.doctorName}`,
                members: members,
                doctor_name: consultation.doctorName,
                patient_name: consultation.patientName,
                consultation_id: consultation.consultationId,
                // We don't have doctor's profile image in the consultation object based on consultation.ts
                // but we can pass names for metadata.
            } as any);

            console.log('Watching channel...');
            await newChannel.watch();
            console.log('Channel watched successfully');
            setChannel(newChannel);
        } catch (err: any) {
            console.error('Chat Initialization Error:', err);
            const detail = err.explanation || err.message || String(err);
            setError(`Initialization Failed: ${detail}`);
        } finally {
            setLoading(false);
        }
    }, [client, isOpen, consultation, connectUser, sanitizeId]);

    useEffect(() => {
        if (isOpen) {
            initChat();
        }
    }, [isOpen, initChat]);

    const isExpired = Date.now() > consultation.chatExpiration;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] md:hidden"
                    />

                    {/* Sidebar Container */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-[100dvh] w-full md:w-[450px] bg-white border-l border-slate-200 shadow-2xl z-[101] flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-primary text-white p-4 flex justify-between items-center shadow-md">
                            <div className="flex flex-col">
                                <span className="text-lg font-black tracking-tight leading-tight">{consultation.doctorName}</span>
                                <span className="text-[10px] uppercase tracking-widest opacity-80">Patient Consultation Chat</span>
                            </div>
                            <Button
                                isIconOnly
                                variant="light"
                                onPress={onClose}
                                className="text-white hover:bg-white/10 rounded-full"
                            >
                                <FaTimes />
                            </Button>
                        </div>

                        {/* Content Area — use relative so child can use absolute inset-0 */}
                        <div className="flex-1 min-h-0 relative overflow-hidden">
                            {loading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <LoadingIndicator size={30} />
                                    <p className="text-slate-400 text-sm font-medium animate-pulse">Establishing secure connection...</p>
                                </div>
                            ) : error ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-4">
                                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl">
                                        ⚠️
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-slate-900 font-bold text-lg">Connection Failed</p>
                                        <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
                                    </div>
                                    <Button
                                        color="primary"
                                        variant="flat"
                                        onPress={initChat}
                                        className="mt-2 font-bold"
                                    >
                                        Retry Connection
                                    </Button>
                                </div>
                            ) : client && channel ? (
                                /* absolute inset-0 gives Stream Chat a concrete pixel height to work with */
                                <div className="absolute inset-0 flex flex-col stream-chat-container">
                                    {isExpired && (
                                        <div className="bg-amber-50 border-b border-amber-100 p-3 flex items-center justify-center gap-2 shrink-0">
                                            <span className="text-amber-600 text-sm font-bold">⚠️ Chat has expired and is now read-only</span>
                                        </div>
                                    )}

                                    {/* Custom layout — bypasses Stream Window height issues */}
                                    <Chat client={client} theme="messaging light">
                                        <Channel channel={channel}>
                                            {/* ChannelHeader — fixed height */}
                                            <div className="shrink-0">
                                                <ChannelHeader />
                                            </div>

                                            {/* MessageList — scrollable middle section */}
                                            <div className="flex-1 min-h-0 overflow-y-auto">
                                                <MessageList />
                                            </div>

                                            {/* MessageInput — always pinned at bottom */}
                                            {!isExpired && (
                                                <div className="shrink-0 border-t border-slate-100">
                                                    <MessageInput focus />
                                                </div>
                                            )}

                                            <Thread />
                                        </Channel>
                                    </Chat>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                                    <p className="text-slate-500 font-medium">Unable to connect to chat. Please try again later.</p>
                                </div>
                            )}
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
