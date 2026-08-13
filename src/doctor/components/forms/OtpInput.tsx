"use client";

import { useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";

interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = true,
  disabled = false,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const chars = value.padEnd(length, " ").slice(0, length).split("");

  const setChar = (index: number, char: string) => {
    const next = value.split("");
    while (next.length < length) next.push("");
    next[index] = char;
    const joined = next.join("").trimEnd().slice(0, length);
    onChange(joined);
    if (joined.length === length && onComplete) onComplete(joined);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setChar(index, "");
      return;
    }
    if (raw.length > 1) {
      const slice = raw.slice(0, length - index);
      const merged = (value.slice(0, index) + slice).slice(0, length);
      onChange(merged);
      const focusIdx = Math.min(index + slice.length, length - 1);
      inputsRef.current[focusIdx]?.focus();
      if (merged.length === length && onComplete) onComplete(merged);
      return;
    }
    setChar(index, raw);
    if (index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (chars[index]?.trim()) {
        setChar(index, "");
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setChar(index - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIdx]?.focus();
    if (pasted.length === length && onComplete) onComplete(pasted);
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          value={chars[i]?.trim() || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          className="h-14 w-12 rounded-2xl border-2 border-slate-200 bg-white text-center text-xl font-bold text-slate-900 transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 sm:h-16 sm:w-14 sm:text-2xl"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
