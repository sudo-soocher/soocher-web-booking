"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { FaCamera, FaFilePdf, FaPlus, FaTrashAlt, FaUpload } from "react-icons/fa";
import { Spinner } from "@heroui/react";

interface UploaderProps {
  value?: string;
  onChange: (url: string) => void;
  upload: (file: File) => Promise<string>;
  disabled?: boolean;
}

export function ImageUploader({ value, onChange, upload, disabled }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const url = await upload(file);
      onChange(url);
    } catch (e) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition hover:border-primary hover:bg-primary-50 hover:text-primary disabled:cursor-not-allowed"
      >
        {value ? (
          <Image src={value} alt="Profile" fill className="object-cover" sizes="96px" />
        ) : busy ? (
          <Spinner size="sm" />
        ) : (
          <FaCamera className="text-xl" />
        )}
      </button>
      <div className="flex flex-col gap-1 text-sm">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-fit rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary"
        >
          {value ? "Change photo" : "Upload photo"}
        </button>
        <span className="text-xs text-slate-500">PNG or JPG, max ~5 MB.</span>
        {error && <span className="text-xs font-bold text-rose-600">{error}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
      />
    </div>
  );
}

export function FileUploader({ value, onChange, upload, disabled }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const url = await upload(file);
      onChange(url);
    } catch (e) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600 transition hover:border-primary hover:bg-primary-50 hover:text-primary disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-3">
          {value ? <FaFilePdf className="text-primary" /> : <FaUpload />}
          <span className="font-semibold">
            {busy ? "Uploading…" : value ? "Document uploaded" : "Upload PDF or JPG"}
          </span>
        </span>
        <span className="text-xs font-bold text-primary">
          {value ? "Replace" : "Browse"}
        </span>
      </button>
      {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
      />
    </div>
  );
}

/** Chip multi-select. Click to toggle. Supports a free-form `addCustom` mode. */
export function ChipMultiSelect({
  options,
  value,
  onChange,
  allowCustom,
  placeholder = "Add custom…",
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const has = (s: string) => value.includes(s);
  const toggle = (s: string) =>
    has(s) ? onChange(value.filter((v) => v !== s)) : onChange([...value, s]);

  const addCustom = () => {
    const v = draft.trim();
    if (!v || has(v)) return;
    onChange([...value, v]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[...options, ...value.filter((v) => !options.includes(v))].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${
              has(opt)
                ? "border-primary bg-primary text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {allowCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            className="h-12 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-400 shadow-sm transition-all hover:border-primary-300 hover:shadow-md hover:shadow-primary/5 focus:border-primary focus:shadow-lg focus:shadow-primary/15 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-md shadow-primary/30 transition hover:bg-primary-600 hover:shadow-lg hover:shadow-primary/40"
            aria-label="Add"
          >
            <FaPlus className="text-xs" />
          </button>
        </div>
      )}
    </div>
  );
}

/** One card with a tap-to-confirm remove button at the bottom-right. */
function ListItemCard<T extends { id: string }>({
  item,
  idx,
  onRemove,
  renderItem,
}: {
  item: T;
  idx: number;
  onRemove: (id: string) => void;
  renderItem: (item: T, idx: number) => React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between pb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          #{idx + 1}
        </span>
        {confirming ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(false);
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700"
            >
              <FaTrashAlt className="text-[10px]" />
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(true);
            }}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <FaTrashAlt className="text-[10px]" />
            Remove
          </button>
        )}
      </div>
      {renderItem(item, idx)}
    </div>
  );
}

/** Reusable wrapper for "Add / remove items in a list" sections (education, experience, etc.). */
export function DynamicListSection<T extends { id: string }>({
  items,
  onAdd,
  onRemove,
  emptyText = "Nothing added yet.",
  addLabel = "Add",
  renderItem,
}: {
  items: T[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  emptyText?: string;
  addLabel?: string;
  renderItem: (item: T, idx: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      )}
      {items.map((item, idx) => (
        <ListItemCard
          key={item.id}
          item={item}
          idx={idx}
          onRemove={onRemove}
          renderItem={renderItem}
        />
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/60 py-3 text-sm font-bold text-primary hover:bg-primary-50"
      >
        <FaPlus className="text-xs" />
        {addLabel}
      </button>
    </div>
  );
}

export function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
