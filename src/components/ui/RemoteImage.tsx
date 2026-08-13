"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Must stay in sync with `images.remotePatterns` in next.config.ts. A host that
 * is listed here but not there makes the optimizer return 400 and the image
 * silently breaks, so the fallback below covers anything unrecognised.
 */
const OPTIMIZABLE_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
]);

const preloaded = new Set<string>();

function isOptimizable(src: string): boolean {
  try {
    return OPTIMIZABLE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

/**
 * Starts the detail-size avatar request before navigation completes. Next/Image
 * cannot emit an SSR preload because the remote URL only arrives from Firestore
 * on the client.
 */
export function preloadRemoteImage(src: string, width = 128): void {
  if (typeof window === "undefined" || !src) return;

  const url = isOptimizable(src)
    ? `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`
    : src;
  if (preloaded.has(url)) return;
  preloaded.add(url);

  const image = new window.Image();
  image.decoding = "async";
  image.fetchPriority = "high";
  image.src = url;
}

interface RemoteImageProps {
  src: string;
  alt: string;
  /** Rendered CSS size, e.g. "(max-width: 768px) 64px, 96px". */
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Disable pulsing for prominent images where a static placeholder is calmer. */
  shimmer?: boolean;
}

/**
 * Fill-mode remote image. The parent element must be `relative` and have a
 * definite size — that fixed box is what stops the card reflowing when the
 * image arrives.
 *
 * Avatars were previously rendered with NextUI's <Image>, which emits a plain
 * <img> with no width/height, no lazy loading and no format negotiation, so
 * every list downloaded full-resolution originals.
 */
export function RemoteImage({
  src,
  alt,
  sizes,
  className,
  priority,
  shimmer = true,
}: RemoteImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const initials = alt
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const placeholder = !loaded ? (
    <span
      aria-hidden="true"
      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-cyan-100/70 font-black text-primary ${failed || !shimmer ? "text-lg" : "animate-pulse text-transparent"}`}
    >
      {failed || !shimmer ? initials : ""}
    </span>
  ) : null;

  if (isOptimizable(src)) {
    return (
      <>
        {placeholder}
        {!failed && (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`${className ?? ""} transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </>
    );
  }

  // Unrecognised host — the optimizer would reject it. Serve it directly, but
  // still lazily and off the main thread.
  return (
    <>
      {placeholder}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full ${className ?? ""} transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}
