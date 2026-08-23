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
import { useMobileVisualViewport } from "@/hooks/useMobileVisualViewport";
import { getDirectConsultationChannel } from "@/lib/chat/directConsultationChannel";

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
    const chatViewportRef = useMobileVisualViewport<HTMLDivElement>(isOpen);

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

            const members = Array.from(new Set([uid, ...(consultation.participants || [])]))
                .filter((id) => id && id.trim() !== "")
                .map((id) => sanitizeId(id));

            const newChannel = await getDirectConsultationChannel(chatClient, members, {
                consultationId: consultation.consultationId,
                doctorName: consultation.doctorName,
                patientName: consultation.patientName,
            });
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
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            controller.abort();
            document.body.style.overflow = "";
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
                        ref={chatViewportRef}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 26, stiffness: 220 }}
                        className="mobile-chat-viewport fixed inset-0 z-[101] flex w-full flex-col overflow-hidden bg-[#F8FAFC] shadow-2xl md:left-auto md:right-0 md:w-[460px] md:border-l md:border-slate-200"
                    >
                        <header className="relative shrink-0 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700" aria-hidden />
                            <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(at 0% 0%, #8fb8ff 0px, transparent 50%), radial-gradient(at 100% 100%, #2559b3 0px, transparent 50%)" }} aria-hidden />
                            <div className="relative z-10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-5 md:pt-5">
                                <div className="flex items-center justify-between gap-2">
                                    <button type="button" onClick={onClose} aria-label="Close chat" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 md:hidden">
                                        <FiArrowLeft className="text-sm" />
                                    </button>
                                    <span className="hidden md:block" />
                                    <div className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-[10px] font-bold uppercase tracking-widest text-white/85 backdrop-blur">
                                        <FiLock /> Private
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-3">
                                <div className="relative shrink-0">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 text-base font-black text-white shadow-lg shadow-black/20 ring-2 ring-white/20">
                                        {doctorInitials}
                                    </div>
                                    <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-primary-600 ${consultation.doctorInRoom ? "bg-emerald-400" : "bg-slate-300"}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-lg font-black leading-tight tracking-tight text-white">{consultation.doctorName}</p>
                                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-white/80">
                                        <span className={consultation.doctorInRoom ? "text-emerald-200" : "text-white/70"}>{consultation.doctorInRoom ? "Available now" : "Consultation chat"}</span>
                                        <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-white/40" />
                                        <span className="truncate">{consultationLabel}</span>
                                    </div>
                                </div>
                                </div>
                            </div>
                        </header>

                        {isExpired && !loading && !error && (
                            <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
                                <FiLock className="text-[10px]" /> Chat window closed. History is read-only.
                            </div>
                        )}

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
                                <div className="stream-chat-container soocher-chat flex h-full flex-col overflow-hidden">
                                    <Chat client={activeClient} theme="messaging light">
                                            <Channel
                                                channel={channel}
                                                EmptyStateIndicator={() => (
                                                    <PatientChatEmptyState
                                                        doctorName={consultation.doctorName}
                                                        isExpired={isExpired}
                                                    />
                                                )}
                                            >
                                                <Window>
                                                    <MessageList />
                                                    {!isExpired ? (
                                                        <MessageInput />
                                                    ) : (
                                                        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-100 bg-white px-4 py-4 text-xs font-bold uppercase tracking-widest text-slate-400"><FiLock /> Replies disabled</div>
                                                    )}
                                                </Window>
                                                <Thread />
                                            </Channel>
                                    </Chat>
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

function PatientChatEmptyState({
    doctorName,
    isExpired,
}: {
    doctorName: string;
    isExpired: boolean;
}) {
    const firstName = doctorName.replace(/^dr\.?\s*/i, "").split(/\s+/)[0] || "your doctor";

    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 py-12 text-center">
            <div className="relative">
                <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary-400 to-primary-700 text-2xl text-white shadow-xl shadow-primary/30">
                    <FiMessageCircle />
                </div>
                <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/20 blur-2xl" aria-hidden />
            </div>
            <div>
                <p className="text-lg font-black tracking-tight text-slate-900">
                    {isExpired ? "No messages in this consultation" : `Start a conversation with Dr. ${firstName}`}
                </p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                    {isExpired
                        ? "This consultation chat has closed without any messages."
                        : "Your messages are private and will reach your doctor instantly."}
                </p>
            </div>
        </div>
    );
}
