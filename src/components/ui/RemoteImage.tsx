"use client";

import Image from "next/image";

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

function isOptimizable(src: string): boolean {
  try {
    return OPTIMIZABLE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

interface RemoteImageProps {
  src: string;
  alt: string;
  /** Rendered CSS size, e.g. "(max-width: 768px) 64px, 96px". */
  sizes: string;
  className?: string;
  priority?: boolean;
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
}: RemoteImageProps) {
  if (isOptimizable(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }

  // Unrecognised host — the optimizer would reject it. Serve it directly, but
  // still lazily and off the main thread.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className ?? ""}`}
    />
  );
}
