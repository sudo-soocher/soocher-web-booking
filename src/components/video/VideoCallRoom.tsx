"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  ParticipantView,
  useCallStateHooks,
  useCall,
  CallingState,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import {
  FaMicrophone, FaMicrophoneSlash,
  FaVideo, FaVideoSlash,
  FaPhone,
  FaCheckCircle, FaExclamationTriangle,
  FaWifi,
} from "react-icons/fa";
import { Consultation } from "@/types/consultation";

const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_");

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/* ── Timer ───────────────────────────────────────────────────────── */
function useTimer(active: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

/* ── Connecting screen ───────────────────────────────────────────── */
const STEPS = [
  { icon: FaWifi,       label: "Getting secure token…"      },
  { icon: FaVideo,      label: "Initializing video client…" },
  { icon: FaMicrophone, label: "Joining call…"              },
];

function ConnectingScreen({ status, participantName }: { status: string; participantName: string }) {
  const active = Math.max(0, STEPS.findIndex((s) => s.label === status));
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
      </div>
      <div className="relative flex items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2s]" />
        <span className="absolute -inset-4 animate-ping rounded-full bg-primary/10 [animation-duration:2.6s] [animation-delay:0.4s]" />
        <div className="relative z-10 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary to-blue-700 text-2xl font-black text-white shadow-2xl shadow-primary/40 ring-4 ring-primary/30">
          {getInitials(participantName)}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Connecting to</p>
        <h2 className="text-2xl font-black tracking-tight text-white">{participantName}</h2>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < active;
          const cur = i === active;
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${cur ? "border border-primary/30 bg-primary/15" : done ? "border border-emerald-500/20 bg-emerald-500/10" : "opacity-25"}`}>
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white ${cur ? "bg-primary" : done ? "bg-emerald-500" : "bg-white/10"}`}>
                {done ? <FaCheckCircle className="text-xs" /> : <Icon className="text-xs" />}
              </div>
              <p className={`text-xs font-semibold ${cur ? "text-white" : done ? "text-emerald-300" : "text-white/30"}`}>{step.label}</p>
              {cur && (
                <span className="ml-auto flex gap-1">
                  {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Error screen ────────────────────────────────────────────────── */
function ErrorScreen({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-rose-500/10 ring-1 ring-rose-500/30">
        <FaExclamationTriangle className="text-3xl text-rose-400" />
      </div>
      <div>
        <h2 className="text-xl font-black text-white">Could not join call</h2>
        <p className="mt-2 max-w-xs text-sm text-white/50">{error}</p>
      </div>
      <button onClick={onBack} className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20">
        Go Back
      </button>
    </div>
  );
}

/* ── Call ended screen ───────────────────────────────────────────── */
function CallEndedScreen({ onLeave, participantName }: { onLeave: () => void; participantName: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[60px]" />
      </div>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
        className="grid h-24 w-24 place-items-center rounded-[28px] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/30">
        <FaCheckCircle className="text-4xl text-white" />
      </motion.div>
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Session Complete</p>
        <h2 className="text-3xl font-black tracking-tight text-white">Call ended.</h2>
        <p className="mt-2 text-sm text-white/50">Your session with <span className="font-semibold text-white/80">{participantName}</span> has ended.</p>
      </div>
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        onClick={onLeave}
        className="rounded-full bg-gradient-to-r from-primary to-blue-600 px-8 py-4 font-bold text-white shadow-2xl shadow-primary/30 transition-all hover:scale-105">
        Back to Booking
      </motion.button>
    </motion.div>
  );
}

/* ── WhatsApp-style live call UI ─────────────────────────────────── */
function LiveCallUI({ onLeave, participantName }: { onLeave: () => void; participantName: string }) {
  const call = useCall();
  const { useCallCallingState, useRemoteParticipants, useLocalParticipant, useMicrophoneState, useCameraState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const remoteParticipants = useRemoteParticipants();
  const localParticipant = useLocalParticipant();
  const { microphone, isMute: micMuted } = useMicrophoneState();
  const { camera, isMute: camOff } = useCameraState();
  const timer = useTimer(callingState === CallingState.JOINED);
  const pipRef = useRef<HTMLDivElement>(null);

  const toggleMic = useCallback(() => microphone.toggle(), [microphone]);
  const toggleCam = useCallback(() => camera.toggle(), [camera]);
  const endCall = useCallback(async () => {
    await call?.leave();
    onLeave();
  }, [call, onLeave]);

  if (callingState === CallingState.LEFT) {
    return <CallEndedScreen onLeave={onLeave} participantName={participantName} />;
  }

  const remoteParticipant = remoteParticipants[0];
  const otherJoined = !!remoteParticipant;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black">

      {/* ── Remote participant (full screen) ── */}
      <div className="relative flex-1 overflow-hidden">
        {otherJoined ? (
          <div className="h-full w-full [&_.str-video__participant-view]:h-full [&_.str-video__participant-view]:w-full [&_.str-video__participant-view]:rounded-none">
            <ParticipantView participant={remoteParticipant} className="h-full w-full" />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0d0f14]">
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2.5s]" />
              <span className="absolute -inset-5 animate-ping rounded-full bg-primary/8 [animation-duration:3s] [animation-delay:0.5s]" />
              <div className="relative z-10 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary to-blue-800 text-2xl font-black text-white ring-4 ring-primary/20">
                {getInitials(participantName)}
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">{participantName}</p>
              <p className="mt-1 text-sm text-white/40">Ringing…</p>
            </div>
          </div>
        )}

        {/* Top info bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">{participantName}</p>
            <p className="text-xs text-white/60">{otherJoined ? timer : "Calling…"}</p>
          </div>
          {otherJoined && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
            </motion.span>
          )}
        </div>

        {/* Local PiP (bottom-right) */}
        {localParticipant && (
          <div ref={pipRef}
            className="absolute bottom-3 right-3 z-20 h-28 w-20 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl md:h-36 md:w-24">
            {camOff ? (
              <div className="flex h-full w-full items-center justify-center bg-slate-800">
                <FaVideoSlash className="text-xl text-white/40" />
              </div>
            ) : (
              <div className="h-full w-full [&_.str-video__participant-view]:h-full [&_.str-video__participant-view]:w-full [&_.str-video__participant-view]:rounded-none">
                <ParticipantView participant={localParticipant} className="h-full w-full" />
              </div>
            )}
            <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold text-white/60">You</div>
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <div className="shrink-0 bg-[#0d0f14] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <div className="flex items-center justify-center gap-5">

          {/* Mic */}
          <button onClick={toggleMic}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all active:scale-95 ${micMuted ? "bg-rose-500/20 ring-1 ring-rose-500/40" : "bg-white/10 ring-1 ring-white/10 hover:bg-white/20"}`}>
            {micMuted
              ? <FaMicrophoneSlash className="text-xl text-rose-400" />
              : <FaMicrophone className="text-xl text-white" />}
          </button>

          {/* End call */}
          <button onClick={endCall}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 shadow-2xl shadow-rose-500/40 transition-all hover:bg-rose-600 active:scale-95">
            <FaPhone className="rotate-[135deg] text-2xl text-white" />
          </button>

          {/* Camera */}
          <button onClick={toggleCam}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all active:scale-95 ${camOff ? "bg-rose-500/20 ring-1 ring-rose-500/40" : "bg-white/10 ring-1 ring-white/10 hover:bg-white/20"}`}>
            {camOff
              ? <FaVideoSlash className="text-xl text-rose-400" />
              : <FaVideo className="text-xl text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────── */
interface VideoCallRoomProps {
  consultation: Consultation;
  onLeave: () => void;
}

export function VideoCallRoom({ consultation, onLeave }: VideoCallRoomProps) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<ReturnType<StreamVideoClient["call"]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(STEPS[0].label);

  const callId = consultation.extras?.streamCallId;
  const participantName = consultation.extras?.patientDetails?.patientName || consultation.patientName;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !callId) { setError(!callId ? "Video call not set up yet." : "Not signed in."); return; }
    const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY || process.env.NEXT_PUBLIC_STREAM_API_KEY;
    if (!apiKey) { setError("Stream API key not configured."); return; }

    const sanitizedUserId = sanitizeId(user.uid);
    let videoClient: StreamVideoClient;
    let activeCall: ReturnType<StreamVideoClient["call"]>;

    const init = async () => {
      try {
        setStatus(STEPS[0].label);
        const res = await fetch("/api/stream-video-token", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: sanitizedUserId }),
        });
        if (!res.ok) throw new Error("Failed to get video token");
        const { token } = await res.json();
        if (!token) throw new Error("No token returned");

        setStatus(STEPS[1].label);
        videoClient = new StreamVideoClient({
          apiKey,
          user: { id: sanitizedUserId, name: user.displayName || sanitizedUserId, image: user.photoURL || undefined },
          token,
        });

        setStatus(STEPS[2].label);
        activeCall = videoClient.call("default", callId);
        await activeCall.getOrCreate({ data: { members: consultation.participants.map((uid) => ({ user_id: sanitizeId(uid) })) } });
        await activeCall.join({ create: true });

        setClient(videoClient);
        setCall(activeCall);
      } catch (err: unknown) {
        setError((err as { message?: string })?.message || "Failed to join video call.");
      }
    };

    init();
    return () => { activeCall?.leave().catch(() => {}); videoClient?.disconnectUser().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  if (error) return <ErrorScreen error={error} onBack={onLeave} />;
  if (!client || !call) return <ConnectingScreen status={status} participantName={participantName} />;

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <LiveCallUI onLeave={onLeave} participantName={participantName} />
      </StreamCall>
    </StreamVideo>
  );
}
