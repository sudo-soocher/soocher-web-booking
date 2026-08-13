"use client";

import React, { useEffect, useState } from "react";
import { Chat, Channel, Window, MessageList, MessageInput, Thread } from "stream-chat-react";
import type { StreamChat } from "stream-chat";
/* eslint-disable @typescript-eslint/no-explicit-any */
import "stream-chat-react/dist/css/v2/index.css";
import { Button } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertCircle, FiArrowLeft, FiLock, FiMessageCircle, FiRefreshCw } from "react-icons/fi";
import { useStreamChat } from "./StreamChatContext";
import { Consultation } from "@/types/consultation";
import { auth } from "@/lib/firebase-auth";

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    consultation: Consultation;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, consultation }) => {
    const { connectUser, sanitizeId } = useStreamChat();
    const [activeClient, setActiveClient] = useState<StreamChat | null>(null);
    const [channel, setChannel] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const initChat = React.useCallback(async (signal?: AbortSignal) => {
        if (!isOpen) return;

        setLoading(true);
        setError(null);
        setChannel(null);
        try {
            if (!auth.currentUser) throw new Error("No authenticated user found");

            const uid = auth.currentUser.uid;
            const name = auth.currentUser.displayName || "Patient";
            const chatClient = await connectUser(uid, name);

            if (!chatClient?.userID) throw new Error("Stream client failed to connect user");
            if (signal?.aborted) return;

            const channelId = `consultation_${sanitizeId(consultation.consultationId)}`;
            const members = Array.from(new Set([uid, ...(consultation.participants || [])]))
                .filter((id) => id && id.trim() !== "")
                .map((id) => sanitizeId(id));

            const newChannel = chatClient.channel("messaging", channelId, {
                name: `Consultation with ${consultation.doctorName}`,
                members,
                doctor_name: consultation.doctorName,
                patient_name: consultation.patientName,
                consultation_id: consultation.consultationId,
            } as any);

            await Promise.race([
                newChannel.watch(),
                new Promise((_, reject) => window.setTimeout(() => reject(new Error("Chat connection timed out. Please try again.")), 15000)),
            ]);
            if (signal?.aborted) return;
            setActiveClient(chatClient);
            setChannel(newChannel);
        } catch (err: any) {
            console.error("Chat Initialization Error:", err);
            const detail = err.explanation || err.message || String(err);
            setError(`Initialization failed: ${detail}`);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [isOpen, consultation, connectUser, sanitizeId]);

    useEffect(() => {
        const controller = new AbortController();
        if (isOpen) {
            initChat(controller.signal);
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
        } else {
            document.body.style.overflow = "";
            document.body.style.position = "";
            document.body.style.width = "";
        }

        return () => {
            controller.abort();
            document.body.style.overflow = "";
            document.body.style.position = "";
            document.body.style.width = "";
        };
    }, [isOpen, initChat]);

    useEffect(() => {
        if (!loading && activeClient && channel) {
            const observer = new MutationObserver(() => {
                document.querySelectorAll<HTMLInputElement>(".stream-chat-container input[type='file']")
                    .forEach((input) => {
                        if (input.getAttribute("accept") !== "image/*,application/pdf,.pdf") {
                            input.setAttribute("accept", "image/*,application/pdf,.pdf");
                        }
                    });
            });
            const chatContainer = document.querySelector(".stream-chat-container");
            observer.observe(chatContainer || document.body, { childList: true, subtree: true, attributes: true });
            return () => observer.disconnect();
        }
    }, [loading, activeClient, channel]);

    const isExpired = Date.now() > (consultation.chatExpiration || 0);
    const doctorInitials = consultation.doctorName
        .replace(/^dr\.?\s*/i, "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "DR";
    const consultationLabel = new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(consultation.consultationTime));

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-slate-950/35 backdrop-blur-[3px]"
                    />

                    <motion.div
                        initial={{ x: "100%", opacity: 0.85 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0.9 }}
                        transition={{ type: "spring", damping: 29, stiffness: 260, mass: 0.9 }}
                        className="soocher-chat-screen fixed inset-0 z-[101] flex w-full flex-col overflow-hidden bg-[#f5f8ff] md:left-auto md:right-0 md:w-[460px] md:border-l md:border-white/70 md:shadow-[-24px_0_70px_rgba(15,23,42,0.18)]"
                    >
                        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#1e62cb] via-[#2f73db] to-[#50a5ec] px-4 pb-5 pt-[max(14px,env(safe-area-inset-top))] text-white">
                            <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-white/10" />
                            <div className="pointer-events-none absolute -bottom-20 left-16 h-36 w-36 rounded-full bg-cyan-200/10 blur-2xl" />

                            <div className="relative flex items-center gap-3">
                                <button type="button" onClick={onClose} aria-label="Close chat" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-xl shadow-sm backdrop-blur-md transition hover:bg-white/20 active:scale-95">
                                    <FiArrowLeft />
                                </button>
                                <div className="relative shrink-0">
                                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/95 text-sm font-black tracking-wide text-[#246bd3] shadow-[0_8px_22px_rgba(14,60,130,0.22)]">
                                        {doctorInitials}
                                    </div>
                                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#3277dc] ${consultation.doctorInRoom ? "bg-emerald-400" : "bg-sky-200"}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[17px] font-extrabold leading-tight tracking-[-0.01em]">{consultation.doctorName}</p>
                                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-blue-50/90">
                                        <span className="shrink-0">{consultation.doctorInRoom ? "Available now" : "Consultation chat"}</span>
                                        <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-white/55" />
                                        <span className="truncate">{consultationLabel}</span>
                                    </div>
                                </div>
                                <div className="hidden h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-50 sm:flex">
                                    <FiLock /> Private
                                </div>
                            </div>
                        </div>

                        <div className="relative min-h-0 flex-1 overflow-hidden">
                            {loading ? (
                                <div className="chat-loading-shimmer flex h-full flex-col bg-[#f6f8fc] px-4 pb-6 pt-7" aria-label="Loading conversation">
                                    <div className="mb-7 flex justify-center"><div className="h-7 w-40 rounded-full bg-slate-200/80" /></div>
                                    <div className="mb-4 h-16 w-[72%] rounded-[22px] rounded-bl-md bg-white shadow-sm" />
                                    <div className="mb-4 ml-auto h-20 w-[78%] rounded-[22px] rounded-br-md bg-blue-100/80" />
                                    <div className="mb-4 h-12 w-[54%] rounded-[22px] rounded-bl-md bg-white shadow-sm" />
                                    <div className="mt-auto h-[58px] w-full rounded-[22px] bg-white shadow-[0_8px_30px_rgba(30,67,120,0.08)]" />
                                </div>
                            ) : error ? (
                                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                                    <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-rose-50 text-2xl text-rose-500 shadow-sm"><FiAlertCircle /></div>
                                    <div className="space-y-2">
                                        <p className="text-lg font-extrabold text-slate-900">Couldn&apos;t open the chat</p>
                                        <p className="max-w-xs text-sm leading-relaxed text-slate-500">{error}</p>
                                    </div>
                                    <Button color="primary" onPress={() => initChat()} startContent={<FiRefreshCw />} className="mt-2 h-12 rounded-2xl bg-[#2f73db] px-6 font-bold text-white shadow-[0_10px_24px_rgba(47,115,219,0.24)]">Try again</Button>
                                </div>
                            ) : activeClient && channel ? (
                                <div className="stream-chat-container flex h-full flex-col overflow-hidden">
                                    {isExpired && (
                                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mx-3 mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-amber-800 shadow-sm">
                                            <FiLock className="mt-0.5 shrink-0 text-sm" />
                                            <div>
                                                <p className="text-xs font-extrabold">This consultation chat has ended</p>
                                                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">You can still read the conversation, but new messages are disabled.</p>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div className="relative min-h-0 flex-1">
                                        <Chat client={activeClient} theme="messaging light soocher-user-chat">
                                            <Channel channel={channel}>
                                                <Window>
                                                    <div className="min-h-0 flex-1"><MessageList /></div>
                                                    {!isExpired ? (
                                                        <div className="soocher-chat-input"><MessageInput focus /></div>
                                                    ) : (
                                                        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-200/70 bg-white/90 px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))] text-xs font-bold text-slate-400 backdrop-blur-xl"><FiLock /> Conversation is read-only</div>
                                                    )}
                                                </Window>
                                                <Thread />
                                            </Channel>
                                        </Chat>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center p-8 text-center">
                                    <div className="max-w-xs"><FiMessageCircle className="mx-auto mb-3 text-4xl text-blue-300" /><p className="font-semibold text-slate-500">Unable to connect to chat. Please try again later.</p></div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
