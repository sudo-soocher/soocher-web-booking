"use client";

import React, { useEffect, useState } from 'react';
import {
    Chat,
    Channel,
    Window,
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
            // Prevent body scroll when chat is open on mobile
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, [isOpen, initChat]);

    useEffect(() => {
        if (!loading && client && channel) {
            const observer = new MutationObserver(() => {
                const fileInputs = document.querySelectorAll<HTMLInputElement>('.stream-chat-container input[type="file"]');
                fileInputs.forEach(input => {
                    // Update the accept attribute to only allow images and PDFs
                    if (input.getAttribute('accept') !== 'image/*,application/pdf,.pdf') {
                        input.setAttribute('accept', 'image/*,application/pdf,.pdf');
                    }
                });
            });

            // Start observing the chat container
            const chatContainer = document.querySelector('.stream-chat-container');
            if (chatContainer) {
                observer.observe(chatContainer, { childList: true, subtree: true, attributes: true });
            } else {
                // Fallback to body if container is somehow not found immediately
                observer.observe(document.body, { childList: true, subtree: true });
            }

            return () => {
                observer.disconnect();
            };
        }
    }, [loading, client, channel]);

    const isExpired = Date.now() > (consultation.chatExpiration || 0);

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
                        className="fixed inset-0 md:left-auto md:right-0 w-full md:w-[450px] bg-white border-l border-slate-200 shadow-2xl z-[101] flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-primary text-white p-4 flex justify-between items-center shadow-md">
                            <div className="flex flex-col">
                                <span className="text-lg font-black tracking-tight leading-tight">{consultation.doctorName}</span>
                                <span className="text-[10px] uppercase tracking-widest opacity-80">Patient Consultation Chat</span>
                                {/* <span className="text-[8px] bg-white/20 px-1 rounded md:hidden">V5_FIXED_NESTING</span> */}
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

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            {loading ? (
                                <div className="flex h-full flex-col items-center justify-center gap-4">
                                    <LoadingIndicator size={30} />
                                    <p className="text-slate-400 text-sm font-medium animate-pulse">Establishing secure connection...</p>
                                </div>
                            ) : error ? (
                                <div className="flex h-full flex-col items-center justify-center p-8 text-center gap-4">
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
                                <div className="h-full stream-chat-container overflow-hidden flex flex-col">
                                    {isExpired && (
                                        <div className="bg-amber-50 border-b border-amber-100 p-3 flex items-center justify-center gap-2">
                                            <span className="text-amber-600 text-sm font-bold">⚠️ Chat has expired and is now read-only</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-h-0 bg-white relative">
                                        <Chat client={client} theme="messaging light">
                                            <Channel channel={channel}>
                                                <Window>
                                                    <ChannelHeader />
                                                    <div className="flex-1 min-h-0 bg-slate-50">
                                                        <MessageList />
                                                    </div>

                                                    {!isExpired ? (
                                                        <div className="soocher-chat-input border-t border-slate-100 bg-white">
                                                            <MessageInput focus />
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 bg-slate-50 text-slate-400 text-center text-xs font-bold uppercase tracking-widest">
                                                            Chat has expired
                                                        </div>
                                                    )}
                                                </Window>
                                                <Thread />
                                            </Channel>
                                        </Chat>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center p-8 text-center">
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
