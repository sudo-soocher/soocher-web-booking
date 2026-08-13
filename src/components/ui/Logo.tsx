"use client";

import Image from "next/image";

interface LogoProps {
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Logo = ({ className, imageClassName, size = "md" }: LogoProps) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 overflow-hidden ${sizes[size]} ${className || ""}`}>
      <Image
        src="/soocherlogo.jpg"
        alt="Soocher Logo"
        fill
        sizes={size === "xl" ? "64px" : size === "lg" ? "48px" : size === "md" ? "40px" : "32px"}
        className={`object-cover ${imageClassName || ""}`}
        priority
      />
    </div>
  );
};
