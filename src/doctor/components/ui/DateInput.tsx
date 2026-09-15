"use client";

import React, { useRef } from "react";
import { Input } from "@heroui/react";
import { FaRegCalendarAlt } from "react-icons/fa";

/**
 * Date fields across the doctor area. Both variants keep the browser's native
 * `<input type="date">` (so validation, `min`/`max` and the OS picker all still
 * work) but add an explicit calendar button as the visible affordance.
 *
 * The button carries `data-native-date-trigger` so the Soocher mobile app's
 * WebView can intercept its click and route to the native Flutter date picker
 * instead of the in-page one — see `_injectDatePickerHook` in the app repo.
 */

type InputElementWithPicker = HTMLInputElement & { showPicker?: () => void };

function openNativePicker(el: InputElementWithPicker | null) {
  if (!el) return;
  if (typeof el.showPicker === "function") {
    try {
      el.showPicker();
      return;
    } catch {
      // Older Safari / not a user gesture — fall back to focus+click below.
    }
  }
  el.focus();
  el.click();
}

// Hide the browser's own picker indicator so the calendar button is the single
// affordance (still openable everywhere via showPicker()). `appearance-none`
// is required too — on iOS Safari/WKWebView, `type="date"` renders its own
// pill-shaped control with a built-in segmented date + calendar icon that
// hiding just the picker-indicator/spin-button pseudo-elements doesn't
// remove; without it that native chrome visibly clashes with (or flashes
// briefly ahead of) our own calendar button.
const HIDE_NATIVE_INDICATOR =
  "[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden appearance-none [-webkit-appearance:none]";

// Shown while the field is empty. Most browsers ignore `placeholder` on a
// native date input (they render their own format hint), but the Soocher app
// converts the field to a text input in its WebView and reads this attribute.
const DEFAULT_DATE_PLACEHOLDER = "YYYY-MM-DD";

function CalendarButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open date picker"
      tabIndex={-1}
      data-native-date-trigger=""
      onMouseDown={(e) => e.preventDefault()}
      onClick={onOpen}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      <FaRegCalendarAlt className="text-[15px]" />
    </button>
  );
}

type HeroDateInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "endContent" | "ref"
>;

/** HeroUI-styled date field (used in the onboarding steps). */
export function HeroDateInput(props: HeroDateInputProps) {
  const ref = useRef<InputElementWithPicker>(null);
  const existingInputClass =
    typeof props.classNames?.input === "string" ? props.classNames.input : "";
  return (
    <Input
      {...props}
      ref={ref}
      type="date"
      placeholder={props.placeholder ?? DEFAULT_DATE_PLACEHOLDER}
      classNames={{
        ...props.classNames,
        input: `${existingInputClass} ${HIDE_NATIVE_INDICATOR}`.trim(),
      }}
      endContent={
        <CalendarButton onOpen={() => openNativePicker(ref.current)} />
      }
    />
  );
}

type NativeDateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

/** Plain-styled date field (used on the consultation post/prescription pages). */
export function NativeDateInput({
  className = "",
  placeholder = DEFAULT_DATE_PLACEHOLDER,
  ...props
}: NativeDateInputProps) {
  const ref = useRef<InputElementWithPicker>(null);
  return (
    <div className="relative w-full">
      <input
        {...props}
        ref={ref}
        type="date"
        placeholder={placeholder}
        className={`${className} pr-12 ${HIDE_NATIVE_INDICATOR}`.trim()}
      />
      <button
        type="button"
        aria-label="Open date picker"
        tabIndex={-1}
        data-native-date-trigger=""
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => openNativePicker(ref.current)}
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <FaRegCalendarAlt className="text-[15px]" />
      </button>
    </div>
  );
}
