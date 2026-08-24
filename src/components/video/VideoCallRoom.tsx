"use client";

import { useCallback, useEffect, useState } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  ParticipantView,
  useCallStateHooks,
  useCall,
  CallingState,
  hasVideo,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaArrowLeft,
  FaCheck,
  FaExclamationTriangle,
  FaLock,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaVolumeUp,
  FaWifi,
} from "react-icons/fa";
import { MdCallEnd } from "react-icons/md";
import { auth } from "@/lib/firebase-auth";
import { Consultation } from "@/types/consultation";

const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_");

function getInitials(name: string) {
  return name
    .replace(/^dr\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "DR";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function useTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [active]);

  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

const STEPS = [
  { icon: FaWifi, label: "Getting secure token…" },
  { icon: FaVideo, label: "Preparing your camera…" },
  { icon: FaMicrophone, label: "Joining consultation…" },
];

function ConnectingScreen({ status, participantName }: { status: string; participantName: string }) {
  const active = Math.max(0, STEPS.findIndex((step) => step.label === status));

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#08111f] px-6 text-center text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[42%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.15] blur-[90px]" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-[80px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative flex w-full max-w-sm flex-col items-center">
        <div className="relative mb-7 grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full border border-blue-400/20 [animation-duration:2.4s]" />
          <span className="absolute inset-3 rounded-full bg-blue-400/10 blur-md" />
          <div className="relative grid h-20 w-20 place-items-center rounded-[28px] border border-white/[0.15] bg-gradient-to-br from-[#3787ed] to-[#1553b7] text-2xl font-black shadow-[0_24px_70px_rgba(30,102,209,0.35)]">
            {getInitials(participantName)}
          </div>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-300">Secure consultation</p>
        <h2 className="mt-2 max-w-full truncate text-2xl font-black tracking-tight">{participantName}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-white/[0.45]"><FaLock className="text-[10px]" /> End-to-end protected</p>

        <div className="mt-8 w-full rounded-[26px] border border-white/10 bg-white/[0.055] p-2.5 shadow-2xl backdrop-blur-xl">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const complete = index < active;
            const current = index === active;
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex min-h-12 items-center gap-3 rounded-[18px] px-3 transition ${current ? "bg-white/10" : ""}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${complete ? "bg-emerald-400 text-slate-950" : current ? "bg-blue-500 text-white" : "bg-white/5 text-white/25"}`}>
                  {complete ? <FaCheck className="text-xs" /> : <Icon className="text-xs" />}
                </span>
                <span className={`text-left text-xs font-semibold ${complete ? "text-emerald-300" : current ? "text-white" : "text-white/25"}`}>{step.label}</span>
                {current && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-blue-400" />}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function ErrorScreen({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#08111f] px-6 text-center">
      <div className="absolute h-80 w-80 rounded-full bg-rose-500/10 blur-[90px]" />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm rounded-[30px] border border-white/10 bg-white/[0.055] p-7 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-rose-500/[0.15] text-2xl text-rose-400 ring-1 ring-rose-400/25">
          <FaExclamationTriangle />
        </div>
        <h2 className="mt-5 text-xl font-black text-white">Couldn&apos;t join the call</h2>
        <p className="mt-2 text-sm leading-6 text-white/50">{error}</p>
        <button onClick={onBack} className="mt-7 h-[52px] w-full rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-slate-900 transition active:scale-[0.98]">
          Return to booking
        </button>
      </motion.div>
    </div>
  );
}

function CallEndedScreen({ onLeave, participantName, duration }: { onLeave: () => void; participantName: string; duration: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex h-full flex-col overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-1/4 h-80 w-80 rounded-full bg-blue-500/[0.13] blur-[100px]" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-[90px]" />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 24, stiffness: 220 }}
          className="w-full max-w-md overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.065] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-7"
        >
          <div className="relative mx-auto grid h-24 w-24 place-items-center">
            <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1.35, opacity: 0 }} transition={{ duration: 1, delay: 0.2 }} className="absolute inset-2 rounded-full bg-emerald-400/30" />
            <motion.div initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 13, stiffness: 190, delay: 0.08 }} className="grid h-20 w-20 place-items-center rounded-[27px] bg-gradient-to-br from-emerald-300 to-emerald-500 text-2xl text-[#052719] shadow-[0_22px_55px_rgba(52,211,153,0.25)]">
              <FaCheck />
            </motion.div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.23em] text-emerald-300">Consultation complete</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Call ended</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/[0.52]">Your secure video consultation with <span className="font-bold text-white/[0.85]">{participantName}</span> has finished.</p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2.5">
            <div className="rounded-[20px] border border-white/[0.08] bg-black/[0.15] px-3 py-3.5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/[0.35]">Duration</p>
              <p className="mt-1 font-mono text-base font-black text-white">{duration}</p>
            </div>
            <div className="rounded-[20px] border border-white/[0.08] bg-black/[0.15] px-3 py-3.5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/[0.35]">Connection</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-extrabold text-emerald-300"><FaLock className="text-[10px]" /> Secure</p>
            </div>
          </div>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onLeave}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-white text-sm font-extrabold text-slate-950 shadow-[0_14px_34px_rgba(0,0,0,0.2)] transition hover:bg-blue-50 active:scale-[0.98]"
          >
            View booking details <FaArrowLeft className="rotate-180 text-xs" />
          </motion.button>
          <p className="mt-4 text-center text-[11px] font-medium text-white/[0.35]">Your chat and consultation details remain available in My Bookings.</p>
        </motion.section>
      </div>
    </motion.div>
  );
}

function ControlButton({ active, danger, label, onClick, children }: { active?: boolean; danger?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  if (danger) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full bg-[#e42309] text-white shadow-[0_12px_32px_rgba(228,35,9,0.38)] transition duration-200 hover:bg-[#f02a10] active:scale-90"
      >
        {children}
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className="group flex min-w-14 flex-col items-center gap-1.5">
      <span className={`grid h-[52px] w-[52px] place-items-center rounded-full border transition duration-200 group-active:scale-90 ${active ? "border-rose-400/25 bg-rose-500/[0.18] text-rose-300" : "border-white/[0.12] bg-white/10 text-white backdrop-blur-xl hover:bg-white/[0.18]"}`}>
        {children}
      </span>
      <span className="text-[9px] font-bold text-white/[0.55]">{label}</span>
    </button>
  );
}

function LiveCallUI({ onLeave, participantName }: { onLeave: () => void; participantName: string }) {
  const call = useCall();
  const { useCallCallingState, useRemoteParticipants, useLocalParticipant, useMicrophoneState, useCameraState, useSpeakerState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const remoteParticipants = useRemoteParticipants();
  const localParticipant = useLocalParticipant();
  const { microphone, isMute: micMuted } = useMicrophoneState();
  const { camera, isMute: cameraOff } = useCameraState();
  const { speaker, devices: speakerDevices, selectedDevice: selectedSpeaker, isDeviceSelectionSupported: canSelectSpeaker } = useSpeakerState();
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(false);
  const [deviceNotice, setDeviceNotice] = useState<string | null>(null);
  const timer = useTimer(callingState === CallingState.JOINED && !ended);

  const toggleMicrophone = useCallback(async () => {
    try {
      if (micMuted) await microphone.enable();
      else await microphone.disable();
      setDeviceNotice(null);
    } catch {
      setDeviceNotice("Microphone access is blocked. Allow it in your browser settings and try again.");
    }
  }, [microphone, micMuted]);

  const toggleCamera = useCallback(async () => {
    try {
      if (cameraOff) await camera.enable();
      else await camera.disable();
      setDeviceNotice(null);
    } catch {
      setDeviceNotice("Camera access is blocked or unavailable. Allow it in your browser settings and try again.");
    }
  }, [camera, cameraOff]);

  const cycleSpeaker = useCallback(() => {
    if (!canSelectSpeaker || speakerDevices.length < 2) return;
    const currentIndex = speakerDevices.findIndex((d) => d.deviceId === selectedSpeaker);
    const next = speakerDevices[(currentIndex + 1) % speakerDevices.length];
    if (next) speaker.select(next.deviceId);
  }, [speaker, speakerDevices, selectedSpeaker, canSelectSpeaker]);

  const endCall = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      await call?.leave();
    } finally {
      setEnded(true);
      setEnding(false);
    }
  }, [call, ending]);

  if (ended || callingState === CallingState.LEFT) {
    return <CallEndedScreen onLeave={onLeave} participantName={participantName} duration={timer} />;
  }

  const remoteParticipant = remoteParticipants[0];
  const otherJoined = Boolean(remoteParticipant);
  const remoteHasVideo = remoteParticipant ? hasVideo(remoteParticipant) : false;

  return (
    <AnimatePresence mode="wait">
      <motion.div key="live-call" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-full w-full overflow-hidden bg-[#07101d] text-white">
        {otherJoined ? (
          <div className="absolute inset-0 bg-[#0a1423]">
            <div className={`absolute inset-0 transition-opacity duration-500 [&_.str-video__participant-view]:h-full [&_.str-video__participant-view]:w-full [&_.str-video__participant-view]:rounded-none [&_video]:h-full [&_video]:w-full [&_video]:object-cover ${remoteHasVideo ? "opacity-100" : "pointer-events-none opacity-0"}`}>
              <ParticipantView participant={remoteParticipant} className="h-full w-full" />
            </div>
            {!remoteHasVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_38%,#173a68_0%,#0a1729_42%,#060d17_100%)]">
                <div className="absolute h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
                <div className="relative grid h-28 w-28 place-items-center rounded-[38px] border border-white/[0.12] bg-gradient-to-br from-blue-400/80 to-blue-700/80 text-3xl font-black shadow-[0_28px_80px_rgba(21,91,190,0.35)]">{getInitials(participantName)}</div>
                <p className="relative mt-5 text-lg font-extrabold">{participantName}</p>
                <p className="relative mt-1 flex items-center gap-1.5 text-xs text-white/[0.45]"><FaVideoSlash /> Camera is off</p>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#173a68_0%,#0a1729_42%,#060d17_100%)] pb-20">
            <div className="relative grid h-28 w-28 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-[38px] border border-blue-300/20 [animation-duration:2.5s]" />
              <div className="relative grid h-24 w-24 place-items-center rounded-[34px] border border-white/[0.15] bg-gradient-to-br from-[#3f8bea] to-[#154d9d] text-3xl font-black shadow-[0_28px_80px_rgba(21,91,190,0.35)]">{getInitials(participantName)}</div>
            </div>
            <p className="mt-5 text-xl font-black">{participantName}</p>
            <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-white/[0.45]"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" /> Waiting for doctor to join</p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 via-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/[0.85] via-black/[0.42] to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-center gap-3 px-3 pb-4 pt-[max(12px,env(safe-area-inset-top))] sm:px-5">
          <button type="button" onClick={onLeave} aria-label="Leave video screen" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/[0.12] bg-black/20 text-sm text-white backdrop-blur-xl transition hover:bg-white/[0.15] active:scale-95"><FaArrowLeft /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold drop-shadow-md">{participantName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/[0.62]"><span className={`h-1.5 w-1.5 rounded-full ${otherJoined ? "animate-pulse bg-emerald-400" : "bg-amber-300"}`} /> {otherJoined ? timer : "Calling…"}</p>
          </div>
          <div className="flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/75 backdrop-blur-xl"><FaLock className="text-[9px] text-emerald-300" /> Secure</div>
        </div>

        <AnimatePresence>
          {deviceNotice && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={() => setDeviceNotice(null)}
              className="absolute left-3 right-3 top-[max(72px,calc(env(safe-area-inset-top)+64px))] z-40 mx-auto max-w-md rounded-2xl border border-amber-200/20 bg-amber-950/75 px-4 py-3 text-left text-xs font-semibold leading-5 text-amber-100 shadow-2xl backdrop-blur-xl"
            >
              {deviceNotice}
            </motion.button>
          )}
        </AnimatePresence>

        {localParticipant && (
          <motion.div drag dragConstraints={{ left: -230, right: 0, top: -380, bottom: 0 }} dragElastic={0.08} className="absolute bottom-[132px] right-3 z-20 h-36 w-[104px] touch-none overflow-hidden rounded-[24px] border border-white/25 bg-slate-900 shadow-[0_18px_50px_rgba(0,0,0,0.42)] sm:bottom-[140px] sm:right-5 sm:h-40 sm:w-28">
            {cameraOff ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-950"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-sm font-black">You</div><FaVideoSlash className="text-xs text-white/[0.35]" /></div>
            ) : (
              <div className="h-full w-full [&_.str-video__participant-view]:h-full [&_.str-video__participant-view]:w-full [&_.str-video__participant-view]:rounded-none [&_video]:h-full [&_video]:w-full [&_video]:object-cover"><ParticipantView participant={localParticipant} className="h-full w-full" /></div>
            )}
            <span className="absolute bottom-2 left-2 rounded-full bg-black/[0.45] px-2 py-1 text-[9px] font-bold backdrop-blur-md">You</span>
          </motion.div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(14px,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-4 rounded-[30px] border border-white/[0.12] bg-black/[0.35] px-5 pb-3 pt-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:gap-6 sm:px-7">
            <ControlButton active={micMuted} label={micMuted ? "Unmute" : "Mute"} onClick={toggleMicrophone}>{micMuted ? <FaMicrophoneSlash className="text-lg" /> : <FaMicrophone className="text-lg" />}</ControlButton>
            <ControlButton danger label="Hang up" onClick={endCall}><MdCallEnd className={`text-[38px] ${ending ? "animate-pulse" : ""}`} /></ControlButton>
            <ControlButton active={cameraOff} label={cameraOff ? "Start video" : "Camera"} onClick={toggleCamera}>{cameraOff ? <FaVideoSlash className="text-lg" /> : <FaVideo className="text-lg" />}</ControlButton>
            {canSelectSpeaker && speakerDevices.length > 1 && (
              <ControlButton label="Speaker" onClick={cycleSpeaker}><FaVolumeUp className="text-lg" /></ControlButton>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

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
  const participantName = consultation.doctorName || "Your doctor";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !callId) {
      setError(!callId ? "Video call not set up yet." : "Not signed in.");
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY || process.env.NEXT_PUBLIC_STREAM_API_KEY;
    if (!apiKey) {
      setError("Stream API key not configured.");
      return;
    }

    const sanitizedUserId = sanitizeId(user.uid);
    let videoClient: StreamVideoClient;
    let activeCall: ReturnType<StreamVideoClient["call"]>;

    const initialize = async () => {
      try {
        setStatus(STEPS[0].label);
        const response = await fetch("/api/stream-video-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: sanitizedUserId }),
        });
        if (!response.ok) throw new Error("Failed to get video token");
        const { token } = await response.json();
        if (!token) throw new Error("No token returned");

        setStatus(STEPS[1].label);
        videoClient = new StreamVideoClient({
          apiKey,
          user: { id: sanitizedUserId, name: user.displayName || sanitizedUserId, image: user.photoURL || undefined },
          token,
        });

        setStatus(STEPS[2].label);
        activeCall = videoClient.call("default", callId);
        // Call-type defaults may request media during getOrCreate. Mark both
        // devices disabled first so missing/denied hardware never blocks join.
        await Promise.allSettled([
          activeCall.camera.disable(),
          activeCall.microphone.disable(),
        ]);
        await activeCall.getOrCreate({ data: { members: consultation.participants.map((uid) => ({ user_id: sanitizeId(uid) })) } });
        await activeCall.join({ create: true });

        setClient(videoClient);
        setCall(activeCall);
      } catch (initializationError: unknown) {
        setError((initializationError as { message?: string })?.message || "Failed to join video call.");
      }
    };

    initialize();
    return () => {
      activeCall?.leave().catch(() => {});
      videoClient?.disconnectUser().catch(() => {});
    };
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
