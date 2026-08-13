"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaArrowLeft, FaCheck, FaSignOutAlt, FaStethoscope } from "react-icons/fa";
import { Button } from "@/doctor/components/ui/Button";
import { useAuth } from "@/doctor/lib/auth";
import { useEditMode } from "@/doctor/lib/edit-mode";
import { STEPS, getPrevStepSlug, getStepIndex } from "@/doctor/lib/onboarding";

interface ProgressHeaderProps {
  currentSlug: string;
}

export function ProgressHeader({ currentSlug }: ProgressHeaderProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const idx = getStepIndex(currentSlug);
  const prev = getPrevStepSlug(currentSlug);
  const percent = ((idx + 1) / STEPS.length) * 100;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="w-full shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        {prev ? (
          <Link
            href={`/doc/onboarding/${prev}`}
            aria-label="Previous step"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-primary-50 hover:text-primary"
          >
            <FaArrowLeft />
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 text-white">
              <FaStethoscope className="text-sm" />
            </div>
            <span className="text-sm font-black tracking-tight text-slate-900">Soocher</span>
          </div>
        )}
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Step {idx + 1} of {STEPS.length}
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <FaSignOutAlt />
        </button>
      </div>
      <div className="h-1 w-full bg-slate-100">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-700"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", damping: 22, stiffness: 180 }}
        />
      </div>
    </header>
  );
}

interface StepShellProps {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  children: React.ReactNode;
  onNext: () => Promise<void> | void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isLast?: boolean;
}

/** Wrap each step body. Owns the sticky bottom CTA and entry animation. */
export function StepShell({
  title,
  description,
  eyebrow,
  children,
  onNext,
  nextLabel,
  nextDisabled,
  isLast,
}: StepShellProps) {
  const { isEditMode } = useEditMode();
  const effectiveEyebrow = isEditMode ? "Edit profile" : eyebrow;
  const effectiveIsLast = isEditMode ? false : isLast;
  const effectiveLabel =
    nextLabel ??
    (isEditMode ? "Save changes" : effectiveIsLast ? "Submit for review" : "Save & continue");

  return (
    <>
      <motion.div
        key={title}
        // No opacity fade — used to be initial={{opacity:0}}, but on hard
        // refresh that left ~250ms of invisible content (perceived as a
        // blank white screen). Keep a gentle slide-up for navigation polish.
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto flex w-full max-w-3xl flex-col px-5 pb-[max(7rem,env(safe-area-inset-bottom))] pt-6 md:pb-32 md:pt-10"
      >
        <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
          {effectiveEyebrow}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 md:text-base">{description}</p>

        <div className="mt-8 space-y-5">{children}</div>
      </motion.div>

      {/* Sticky bottom CTA — rendered OUTSIDE motion.div so its `position:
          fixed` is positioned against the viewport, not against motion.div's
          transformed containing block (which made the bar briefly narrow on
          first mount). Onboarding has no sidebar, so the bar spans the full
          viewport and centers the CTA under the form via the inner max-w-3xl. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl px-5">
          <Button
            color="primary"
            size="lg"
            onPress={onNext}
            isDisabled={nextDisabled}
            endContent={effectiveIsLast ? <FaCheck /> : undefined}
            className="h-14 w-full rounded-2xl font-bold shadow-2xl shadow-primary/25"
          >
            {effectiveLabel}
          </Button>
        </div>
      </div>
    </>
  );
}

/* ---------- Reusable form atoms used across steps ---------- */

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-rose-200/60 bg-rose-50 p-3 text-xs font-bold text-rose-700">
      {message}
    </p>
  );
}

/* ---------- Shared NextUI classNames for form inputs ---------- *
 * Modern onboarding style: thick rounded border, primary-tinted hover + focus
 * shadow, generous padding. Keep these in one place so every step looks the
 * same and tweaks land everywhere. */

export const inputClassNames = {
  inputWrapper:
    "border-2 border-slate-200 bg-white rounded-2xl shadow-sm transition-all duration-200 " +
    "data-[hover=true]:border-primary-300 data-[hover=true]:shadow-md data-[hover=true]:shadow-primary/5 " +
    "group-data-[focus=true]:border-primary group-data-[focus=true]:shadow-lg group-data-[focus=true]:shadow-primary/15 " +
    "group-data-[focus-visible=true]:ring-0 group-data-[focus-visible=true]:ring-offset-0 " +
    "group-data-[focus-visible=true]:outline-none",
  input:
    "text-sm md:text-base font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal " +
    "outline-none focus:outline-none focus-visible:outline-none " +
    "[&:-webkit-autofill]:[-webkit-text-fill-color:rgb(30_41_59)] " +
    "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]",
  innerWrapper: "gap-2",
} as const;

/**
 * Searchable dropdown (HeroUI Autocomplete) — visually identical to a Select,
 * but the trigger is a real text input that filters the list as you type.
 * Pair with `inputProps={{ classNames: inputClassNames }}` for the input slot.
 */
export const autocompleteClassNames = {
  popoverContent:
    "rounded-2xl border border-slate-100 shadow-2xl shadow-primary/10 bg-white p-1 max-h-[60vh] overflow-hidden",
  listbox: "p-0 max-h-[calc(60vh-0.5rem)] overflow-y-auto custom-scrollbar",
  // Visible chevron: stronger contrast, light hover bg so it reads as an
  // interactive target, and rotates 180° while the popover is open. The
  // default light/icon-only button washes out against our white input.
  selectorButton:
    "text-slate-500 data-[hover=true]:bg-primary-50 data-[hover=true]:text-primary " +
    "transition-transform duration-200 data-[open=true]:rotate-180 data-[open=true]:text-primary",
} as const;

export const selectClassNames = {
  trigger:
    "border-2 border-slate-200 bg-white rounded-2xl shadow-sm transition-all duration-200 " +
    "data-[hover=true]:border-primary-300 data-[hover=true]:shadow-md data-[hover=true]:shadow-primary/5 " +
    "data-[open=true]:border-primary data-[open=true]:shadow-lg data-[open=true]:shadow-primary/15 " +
    "data-[focus=true]:border-primary " +
    "data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
  value: "text-sm md:text-base font-medium text-slate-800 group-data-[has-value=true]:text-slate-800",
  selectorIcon:
    "text-slate-500 transition-transform duration-200 " +
    "group-data-[open=true]:rotate-180 group-data-[open=true]:text-primary",
  popoverContent:
    "rounded-2xl border border-slate-100 shadow-2xl shadow-primary/10 bg-white p-1 max-h-[60vh] overflow-hidden",
  listbox: "p-0 max-h-[calc(60vh-0.5rem)] overflow-y-auto custom-scrollbar",
} as const;

/**
 * Textarea-specific overrides. Same look as the Input but the wrapper must
 * grow with `minRows` — HeroUI inherits Input's fixed `h-*` for the wrapper
 * which clips multi-line content unless we force `h-auto` and add padding.
 */
export const textareaClassNames = {
  base: "h-auto",
  inputWrapper:
    "border-2 border-slate-200 bg-white rounded-2xl shadow-sm transition-all duration-200 " +
    "data-[hover=true]:border-primary-300 data-[hover=true]:shadow-md data-[hover=true]:shadow-primary/5 " +
    "group-data-[focus=true]:border-primary group-data-[focus=true]:shadow-lg group-data-[focus=true]:shadow-primary/15 " +
    "!h-auto py-3 px-4",
  input:
    "text-sm md:text-base font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal " +
    "leading-relaxed outline-none focus:outline-none focus-visible:outline-none resize-none",
  innerWrapper: "h-auto",
} as const;
