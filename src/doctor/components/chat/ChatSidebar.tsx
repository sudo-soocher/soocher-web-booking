"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Channel as ChannelComponent,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import type { Channel } from "stream-chat";
import "stream-chat-react/dist/css/v2/index.css";
import { Button } from "@heroui/react";
import {
  FaArrowLeft,
  FaFilePrescription,
  FaInfoCircle,
  FaLock,
  FaPaperPlane,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useStreamChat } from "@/doctor/components/chat/StreamChatContext";
import { auth } from "@/doctor/lib/firebase";
import type { FirestoreConsultation } from "@/doctor/services/consultations";
import { getChatAvailability } from "@/doctor/utils/chat/availability";
import { DoctorListShimmer } from "@/doctor/components/ui/DoctorShimmer";
import { useMobileVisualViewport } from "@/hooks/useMobileVisualViewport";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: FirestoreConsultation;
}

const AVATAR_GRADIENTS = [
  "from-primary-400 to-primary-700",
  "from-violet-400 to-violet-700",
  "from-emerald-400 to-emerald-700",
  "from-amber-400 to-amber-700",
  "from-rose-400 to-rose-700",
  "from-sky-400 to-sky-700",
];

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "P"
  );
}

function hashIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function formatExpiry(endMs: number): string {
  const diff = endMs - Date.now();
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / 86400000);
  if (days >= 2) return `Closes in ${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 2) return `Closes in ${hours}h`;
  const mins = Math.max(1, Math.floor(diff / 60000));
  return `Closes in ${mins}m`;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, consultation }) => {
  const router = useRouter();
  const { client, connectUser, sanitizeId } = useStreamChat();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatViewportRef = useMobileVisualViewport<HTMLDivElement>(isOpen);

  const patientName =
    consultation.extras?.patientDetails?.patientName ||
    consultation.patientName ||
    "Patient";
  const doctorName = consultation.doctorName || "Doctor";
  const patientAge = consultation.extras?.patientDetails?.patientAge;
  const patientGender = consultation.extras?.patientDetails?.gender;
  const avatarGradient = AVATAR_GRADIENTS[hashIndex(patientName) % AVATAR_GRADIENTS.length];

  const availability = getChatAvailability(consultation);
  const isExpired = !availability.isAvailable;

  const initChat = useCallback(async () => {
    if (!client || !isOpen) return;
    setLoading(true);
    setError(null);
    try {
      if (!auth.currentUser) throw new Error("No authenticated user found");
      const uid = auth.currentUser.uid;
      const name = auth.currentUser.displayName || doctorName;
      await connectUser(uid, name);
      if (!client.userID) throw new Error("Stream client failed to connect user");

      const channelId = `consultation_${sanitizeId(consultation.consultationId)}`;
      const rawMembers = [uid, ...(consultation.participants || [])];
      const members = Array.from(new Set(rawMembers))
        .filter((id) => id && id.trim() !== "")
        .map((id) => sanitizeId(id));

      const newChannel = client.channel("messaging", channelId, {
        name: `Consultation with ${patientName}`,
        members,
        doctor_name: doctorName,
        patient_name: patientName,
        consultation_id: consultation.consultationId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await newChannel.watch();
      setChannel(newChannel);
    } catch (err: unknown) {
      const e = err as { explanation?: string; message?: string };
      console.error("Chat Initialization Error:", err);
      setError(e.explanation || e.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [client, isOpen, consultation, connectUser, sanitizeId, patientName, doctorName]);

  useEffect(() => {
    if (isOpen) {
      initChat();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initChat]);

  // Allow images + PDFs as attachments (Stream defaults to image/* only).
  useEffect(() => {
    if (loading || !client || !channel) return;
    const enforceAccept = () => {
      document
        .querySelectorAll<HTMLInputElement>('.stream-chat-container input[type="file"]')
        .forEach((input) => {
          if (input.getAttribute("accept") !== "image/*,application/pdf,.pdf") {
            input.setAttribute("accept", "image/*,application/pdf,.pdf");
          }
        });
    };
    const observer = new MutationObserver(enforceAccept);
    const container = document.querySelector(".stream-chat-container");
    observer.observe(container || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    enforceAccept();
    return () => observer.disconnect();
  }, [loading, client, channel]);

  const openVideo = () =>
    router.push(`/doc/consultations/${consultation.consultationId}/room`);
  const openDetail = () => router.push(`/doc/consultations/${consultation.consultationId}`);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — mobile */}
          <motion.div
            ref={chatViewportRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-sm md:hidden"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="mobile-chat-viewport fixed inset-0 z-[101] flex w-full flex-col overflow-hidden bg-[#F8FAFC] shadow-2xl md:left-auto md:right-0 md:w-[460px] md:border-l md:border-slate-200"
          >
            {/* ── Custom branded header ────────────────────────────── */}
            <header className="relative overflow-hidden">
              {/* mesh background */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700"
                aria-hidden
              />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background:
                    "radial-gradient(at 0% 0%, #8fb8ff 0px, transparent 50%), radial-gradient(at 100% 100%, #2559b3 0px, transparent 50%)",
                }}
                aria-hidden
              />

              <div className="relative z-10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-5 md:pt-5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 md:hidden"
                    aria-label="Close chat"
                  >
                    <FaArrowLeft className="text-xs" />
                  </button>
                  <span className="hidden md:block" />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={openDetail}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
                      aria-label="Open consultation"
                      title="Open consultation"
                    >
                      <FaInfoCircle className="text-xs" />
                    </button>
                    {!!consultation.extras?.streamCallId && (
                      <button
                        type="button"
                        onClick={openVideo}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
                        aria-label="Join video call"
                        title="Join video call"
                      >
                        <FaVideo className="text-xs" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="hidden h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 md:grid"
                      aria-label="Close chat"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                </div>

                {/* Identity */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${avatarGradient} text-base font-black text-white shadow-lg shadow-black/20 ring-2 ring-white/20`}
                    >
                      {getInitials(patientName)}
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-primary-600 ${
                        isExpired ? "bg-slate-300" : "bg-emerald-400"
                      }`}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-black leading-tight tracking-tight text-white">
                      {patientName}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                      {patientAge && <span>{patientAge}y</span>}
                      {patientAge && patientGender && (
                        <span className="h-1 w-1 rounded-full bg-white/40" />
                      )}
                      {patientGender && <span>{patientGender}</span>}
                      {(patientAge || patientGender) && (
                        <span className="h-1 w-1 rounded-full bg-white/40" />
                      )}
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isExpired ? "text-white/60" : "text-emerald-200"
                        }`}
                      >
                        {isExpired ? (
                          <>
                            <FaLock className="text-[9px]" /> Read-only
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                            Active · {formatExpiry(availability.endTime)}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="mt-3 flex gap-1.5">
                  <QuickChip onClick={openDetail} icon={<FaFilePrescription />}>
                    Record
                  </QuickChip>
                  {!!consultation.extras?.streamCallId && (
                    <QuickChip onClick={openVideo} icon={<FaVideo />}>
                      Video
                    </QuickChip>
                  )}
                </div>
              </div>
            </header>

            {/* ── Expired banner ───────────────────────────────────── */}
            {isExpired && !loading && !error && (
              <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
                <FaLock className="text-[10px]" />
                Chat window closed. History is read-only.
              </div>
            )}

            {/* ── Body ─────────────────────────────────────────────── */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {loading ? (
                <div className="h-full overflow-hidden p-4">
                  <DoctorListShimmer rows={5} />
                </div>
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
                    !
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black tracking-tight text-slate-900">
                      Connection failed
                    </p>
                    <p className="text-sm text-slate-500">{error}</p>
                  </div>
                  <Button
                    color="primary"
                    variant="flat"
                    onPress={initChat}
                    className="mt-2 rounded-full font-bold"
                  >
                    Retry
                  </Button>
                </div>
              ) : client && channel ? (
                <div className="stream-chat-container soocher-chat flex h-full flex-col">
                  <Chat client={client} theme="messaging light">
                    <ChannelComponent
                      channel={channel}
                      EmptyStateIndicator={(props) => (
                        <ChatEmptyState
                          {...props}
                          patientName={patientName}
                          isExpired={isExpired}
                        />
                      )}
                    >
                      <Window>
                        {/* Default ChannelHeader hidden via CSS — we render our own above */}
                        <MessageList />
                        {!isExpired ? (
                          <MessageInput />
                        ) : (
                          <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-white px-4 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                            <FaLock className="text-[10px]" />
                            Replies disabled
                          </div>
                        )}
                      </Window>
                      <Thread />
                    </ChannelComponent>
                  </Chat>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    Unable to load chat. Please try again later.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function QuickChip({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur transition hover:bg-white/25"
    >
      <span className="text-[10px]">{icon}</span>
      {children}
    </button>
  );
}

/**
 * Custom empty state for a channel with no messages — replaces Stream's
 * default "No chats here yet" placeholder with a brand-native illustration.
 */
function ChatEmptyState({
  patientName,
  isExpired,
}: {
  patientName: string;
  isExpired: boolean;
}) {
  const firstName = patientName.split(/\s+/)[0] || "your patient";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 py-12 text-center">
      <div className="relative">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary-400 to-primary-700 text-white shadow-xl shadow-primary/30">
          <FaPaperPlane className="text-2xl" />
        </div>
        {/* soft halo */}
        <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/20 blur-2xl" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-black tracking-tight text-slate-900">
          {isExpired ? "No messages on record" : `Start the conversation with ${firstName}`}
        </p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          {isExpired
            ? "This chat window has closed and no messages were exchanged."
            : "Messages are end-to-end secured and visible to your patient instantly."}
        </p>
      </div>
    </div>
  );
}
