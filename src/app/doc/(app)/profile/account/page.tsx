"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Chip, Input } from "@heroui/react";
import {
  FaAt,
  FaCheck,
  FaEnvelope,
  FaInfoCircle,
  FaKey,
  FaLock,
  FaPhone,
  FaShieldAlt,
  FaTimes,
} from "react-icons/fa";
import { Button } from "@/doctor/components/ui/Button";
import { DoctorPageShimmer, ShimmerBlock } from "@/doctor/components/ui/DoctorShimmer";
import { useAuth } from "@/doctor/lib/auth";
import {
  USERNAME_RULES,
  changePassword,
  checkUsernameAvailable,
  claimUsername,
  describeSignInMethods,
  normaliseUsername,
  sendResetEmail,
  setPassword,
  validateUsername,
} from "@/doctor/lib/account";

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" }
  | { state: "invalid"; reason: string }
  | { state: "error"; reason: string };

export default function AccountSecurityPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [authNonce, setAuthNonce] = useState(0); // bump to re-read user.providerData

  if (loading || !user) {
    return <DoctorPageShimmer compact />;
  }

  // Re-derive sign-in methods on every render so a fresh credential link is
  // reflected as soon as `authNonce` changes.
  void authNonce;
  const methods = describeSignInMethods(user);
  const currentUsername = (profile?.username as string | undefined) || undefined;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-center justify-start gap-3">
        <Chip variant="flat" color="primary" className="text-[11px]">
          <FaShieldAlt className="mr-1 text-[10px]" />
          Account & security
        </Chip>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5"
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Account & security
        </h1>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          Manage how you sign in to Soocher.
        </p>
      </motion.div>

      {/* Identity summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="premium-card mt-6 space-y-3 p-5 md:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-50 text-primary">
            <FaShieldAlt className="text-sm" />
          </div>
          <h2 className="text-base font-black tracking-tight text-slate-900 md:text-lg">
            Signed in as
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {methods.email && (
            <Row icon={FaEnvelope} label="Email" value={methods.email} />
          )}
          {methods.phoneNumber && (
            <Row icon={FaPhone} label="Mobile" value={methods.phoneNumber} />
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            {methods.hasPassword && <Provider label="Email / password" />}
            {methods.hasGoogle && <Provider label="Google" />}
            {methods.hasPhone && <Provider label="Phone OTP" />}
          </div>
        </div>
      </motion.div>

      {/* Username */}
      <UsernameSection
        uid={user.uid}
        username={currentUsername}
        onSaved={refreshProfile}
      />

      {/* Password */}
      <PasswordSection
        hasPassword={methods.hasPassword}
        email={methods.email}
        onChanged={async () => {
          // Pull a fresh user record so providerData reflects the new linked credential.
          await user.reload();
          await refreshProfile();
          setAuthNonce((n) => n + 1);
        }}
      />
    </div>
  );
}

/* ---------- Username ---------- */

function UsernameSection({
  uid,
  username,
  onSaved,
}: {
  uid: string;
  username?: string;
  onSaved: () => Promise<void>;
}) {
  const isSet = Boolean(username);
  const [value, setValue] = useState("");
  const [avail, setAvail] = useState<Availability>({ state: "idle" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Debounced availability check.
  useEffect(() => {
    if (isSet) return;
    const raw = value;
    const v = normaliseUsername(raw);
    if (!v) {
      setAvail({ state: "idle" });
      return;
    }
    const reason = validateUsername(v);
    if (reason) {
      setAvail({ state: "invalid", reason });
      return;
    }
    setAvail({ state: "checking" });
    const t = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(v, uid);
        setAvail({ state: ok ? "available" : "taken" });
      } catch {
        setAvail({ state: "error", reason: "Couldn't check availability. Try again." });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [value, isSet, uid]);

  const handleSave = async () => {
    setSubmitError(null);
    if (avail.state !== "available") return;
    try {
      await claimUsername(uid, value);
      await onSaved();
      setSuccess(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Couldn't save username.");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="premium-card mt-5 p-5 md:p-7"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-50 text-primary">
          <FaAt className="text-sm" />
        </div>
        <h2 className="text-base font-black tracking-tight text-slate-900 md:text-lg">
          Username
        </h2>
      </div>

      {isSet ? (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Your username
              </div>
              <div className="mt-0.5 truncate font-mono text-base font-bold text-slate-900">
                @{username}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
              <FaLock className="text-[8px]" />
              Locked
            </span>
          </div>
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <FaInfoCircle className="mt-0.5 shrink-0 text-slate-400" />
            Usernames can only be set once. Contact support if this needs to
            change.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="font-bold text-amber-700">Not configured.</span>{" "}
            <span className="text-slate-600">
              Pick a username — this is set once and cannot be changed later.
            </span>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Choose your username
            </div>
            <div className="mt-2">
              <Input
                value={value}
                onValueChange={(v) =>
                  setValue(v.toLowerCase().slice(0, USERNAME_RULES.max))
                }
                variant="bordered"
                radius="lg"
                size="lg"
                startContent={<span className="text-slate-400">@</span>}
                placeholder="e.g. dr.hanoona"
                isDisabled={success}
                classNames={{ inputWrapper: "border-2 border-slate-200" }}
              />
            </div>
            <div className="mt-2 min-h-[18px] text-xs">
              <AvailabilityHint state={avail} />
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{USERNAME_RULES.hint}</div>
          </div>

          {submitError && (
            <p className="rounded-2xl border border-rose-200/60 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {submitError}
            </p>
          )}
          {success && (
            <p className="rounded-2xl border border-emerald-200/60 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
              Username saved.
            </p>
          )}

          <Button
            color="primary"
            size="lg"
            onPress={handleSave}
            isDisabled={avail.state !== "available" || success}
            className="h-12 w-full rounded-full font-semibold shadow-2xl shadow-primary/25"
          >
            Save username
          </Button>
        </div>
      )}
    </motion.section>
  );
}

function AvailabilityHint({ state }: { state: Availability }) {
  switch (state.state) {
    case "idle":
      return <span className="text-slate-400">Start typing to check availability.</span>;
    case "checking":
      return (
        <span className="inline-flex items-center gap-2 text-slate-500">
          <ShimmerBlock className="h-3 w-14 rounded-full" />
          Checking…
        </span>
      );
    case "available":
      return (
        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
          <FaCheck className="text-[10px]" />
          Available
        </span>
      );
    case "taken":
      return (
        <span className="inline-flex items-center gap-1.5 font-bold text-rose-600">
          <FaTimes className="text-[10px]" />
          Already taken
        </span>
      );
    case "invalid":
      return <span className="font-semibold text-amber-700">{state.reason}</span>;
    case "error":
      return <span className="font-semibold text-rose-600">{state.reason}</span>;
  }
}

/* ---------- Password ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordSection({
  hasPassword,
  email,
  onChanged,
}: {
  hasPassword: boolean;
  email?: string;
  onChanged: () => Promise<void>;
}) {
  // Mode: which form (if any) is open.
  const [mode, setMode] = useState<"none" | "change" | "set">("none");
  const [emailInput, setEmailInput] = useState(email || "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Keep the email input in sync when the parent prop changes.
  useEffect(() => {
    if (email && !emailInput) setEmailInput(email);
  }, [email, emailInput]);

  const close = () => {
    setMode("none");
    setError(null);
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const handleChange = async () => {
    setError(null);
    setSuccess(null);
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("New passwords don't match.");
    try {
      await changePassword(current, next);
      setSuccess("Password changed.");
      close();
      await onChanged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't change password.";
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setError("Current password is incorrect.");
      } else if (msg.includes("weak-password")) {
        setError("New password is too weak — pick a longer one.");
      } else if (msg.includes("requires-recent-login")) {
        setError("For security, sign out and back in, then try again.");
      } else {
        setError(msg);
      }
    }
  };

  const handleSet = async () => {
    setError(null);
    setSuccess(null);
    const useEmail = (email || emailInput).trim().toLowerCase();
    if (!EMAIL_RE.test(useEmail)) return setError("Enter a valid email.");
    if (next.length < 8) return setError("Password must be at least 8 characters.");
    if (next !== confirm) return setError("Passwords don't match.");
    try {
      await setPassword(next, useEmail);
      setSuccess("Password set. You can now sign in with this email and password.");
      close();
      await onChanged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't set password.";
      if (msg.includes("email-already-in-use")) {
        setError("That email is already linked to another account.");
      } else if (msg.includes("provider-already-linked")) {
        setError("A password is already set on this account.");
      } else if (msg.includes("requires-recent-login")) {
        setError("For security, sign out and back in, then try again.");
      } else if (msg.includes("weak-password")) {
        setError("Password is too weak — pick a longer one.");
      } else {
        setError(msg);
      }
    }
  };

  const handleReset = async () => {
    setError(null);
    setSuccess(null);
    if (!email) return setError("No email on file to send a reset link to.");
    try {
      await sendResetEmail(email);
      setSuccess(`Reset link sent to ${email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send reset email.");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="premium-card mt-5 p-5 md:p-7"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-50 text-primary">
          <FaKey className="text-sm" />
        </div>
        <h2 className="text-base font-black tracking-tight text-slate-900 md:text-lg">
          Password
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
          {hasPassword ? (
            <span className="font-semibold text-emerald-700">Password is set.</span>
          ) : (
            <>
              <span className="font-bold text-amber-700">Not configured.</span>{" "}
              <span className="text-slate-600">
                You sign in without a password right now. Set one below so you
                can also sign in with email + password.
              </span>
            </>
          )}
        </div>

        {/* Primary action — change OR set */}
        {hasPassword && mode === "none" && (
          <Button
            color="primary"
            size="lg"
            variant="bordered"
            onPress={() => {
              setMode("change");
              setError(null);
              setSuccess(null);
            }}
            className="h-12 w-full rounded-full border-2 border-slate-200 font-semibold"
          >
            Change password
          </Button>
        )}
        {!hasPassword && mode === "none" && (
          <Button
            color="primary"
            size="lg"
            onPress={() => {
              setMode("set");
              setError(null);
              setSuccess(null);
            }}
            className="h-12 w-full rounded-full font-semibold shadow-2xl shadow-primary/25"
          >
            Set a password
          </Button>
        )}

        {mode === "change" && (
          <div className="space-y-3">
            <Input
              type="password"
              value={current}
              onValueChange={setCurrent}
              variant="bordered"
              radius="lg"
              size="lg"
              label="Current password"
              classNames={{
                inputWrapper: "border-2 border-slate-200",
                label: "font-semibold text-slate-700",
              }}
            />
            <Input
              type="password"
              value={next}
              onValueChange={setNext}
              variant="bordered"
              radius="lg"
              size="lg"
              label="New password"
              classNames={{
                inputWrapper: "border-2 border-slate-200",
                label: "font-semibold text-slate-700",
              }}
            />
            <Input
              type="password"
              value={confirm}
              onValueChange={setConfirm}
              variant="bordered"
              radius="lg"
              size="lg"
              label="Confirm new password"
              classNames={{
                inputWrapper: "border-2 border-slate-200",
                label: "font-semibold text-slate-700",
              }}
            />
            <div className="flex gap-3">
              <Button
                size="lg"
                variant="bordered"
                onPress={close}
                className="h-12 flex-1 rounded-full border-2 border-slate-200 font-semibold"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                size="lg"
                onPress={handleChange}
                className="h-12 flex-1 rounded-full font-semibold shadow-2xl shadow-primary/25"
              >
                Update
              </Button>
            </div>
          </div>
        )}

        {mode === "set" && (
          <div className="space-y-3">
            {!email && (
              <Input
                type="email"
                value={emailInput}
                onValueChange={setEmailInput}
                variant="bordered"
                radius="lg"
                size="lg"
                label="Email"
                placeholder="you@example.com"
                classNames={{
                  inputWrapper: "border-2 border-slate-200",
                  label: "font-semibold text-slate-700",
                }}
              />
            )}
            {email && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs">
                <FaEnvelope className="shrink-0 text-slate-400" />
                <span className="text-slate-500">Email on file:</span>
                <span className="truncate font-bold text-slate-700">{email}</span>
              </div>
            )}
            <Input
              type="password"
              value={next}
              onValueChange={setNext}
              variant="bordered"
              radius="lg"
              size="lg"
              label="New password"
              classNames={{
                inputWrapper: "border-2 border-slate-200",
                label: "font-semibold text-slate-700",
              }}
            />
            <Input
              type="password"
              value={confirm}
              onValueChange={setConfirm}
              variant="bordered"
              radius="lg"
              size="lg"
              label="Confirm password"
              classNames={{
                inputWrapper: "border-2 border-slate-200",
                label: "font-semibold text-slate-700",
              }}
            />
            <p className="text-[11px] leading-relaxed text-slate-500">
              At least 8 characters. After this, you can sign in either with this
              email + password or with your existing method.
            </p>
            <div className="flex gap-3">
              <Button
                size="lg"
                variant="bordered"
                onPress={close}
                className="h-12 flex-1 rounded-full border-2 border-slate-200 font-semibold"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                size="lg"
                onPress={handleSet}
                className="h-12 flex-1 rounded-full font-semibold shadow-2xl shadow-primary/25"
              >
                Set password
              </Button>
            </div>
          </div>
        )}

        {hasPassword && email && mode === "none" && (
          <Button
            size="lg"
            variant="light"
            onPress={handleReset}
            startContent={<FaEnvelope />}
            className="h-12 w-full rounded-full font-semibold text-primary hover:bg-primary-50"
          >
            Send reset link to {email}
          </Button>
        )}

        {error && (
          <p className="rounded-2xl border border-rose-200/60 bg-rose-50 p-3 text-xs font-bold text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-2xl border border-emerald-200/60 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
            {success}
          </p>
        )}
      </div>
    </motion.section>
  );
}

/* ---------- atoms ---------- */

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-500">
        <Icon className="text-xs" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function Provider({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold text-primary">
      {label}
    </span>
  );
}
