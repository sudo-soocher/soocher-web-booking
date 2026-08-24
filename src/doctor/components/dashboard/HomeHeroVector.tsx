"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function HomeHeroVector() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 220 190"
      className="doctor-home-hero-vector"
      initial={reduceMotion ? false : { opacity: 0, x: 16, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      <defs>
        <linearGradient id="home-vector-panel" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity="0.27" />
          <stop offset="1" stopColor="#dbeafe" stopOpacity="0.09" />
        </linearGradient>
        <linearGradient id="home-vector-accent" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>

      <circle cx="133" cy="94" r="71" fill="#93c5fd" fillOpacity="0.1" />
      <circle cx="133" cy="94" r="54" fill="none" stroke="#fff" strokeOpacity="0.12" />

      <motion.g
        animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="69" y="35" width="112" height="119" rx="25" fill="url(#home-vector-panel)" stroke="#fff" strokeOpacity="0.25" />
        <rect x="88" y="54" width="74" height="42" rx="14" fill="#fff" fillOpacity="0.94" />
        <rect x="100" y="65" width="28" height="5" rx="2.5" fill="#60a5fa" />
        <rect x="100" y="76" width="48" height="4" rx="2" fill="#cbd5e1" />
        <circle cx="148" cy="67" r="7" fill="url(#home-vector-accent)" />
        <path d="M148 63.5v7M144.5 67h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M89 124h18l7-17 11 33 10-24 8 8h20" fill="none" stroke="#67e8f9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      <motion.g
        animate={reduceMotion ? undefined : { y: [0, 5, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      >
        <rect x="39" y="110" width="46" height="46" rx="16" fill="#fff" fillOpacity="0.96" />
        <path d="M62 121v24M50 133h24" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" />
      </motion.g>

      <motion.circle
        cx="185"
        cy="48"
        r="5"
        fill="#6ee7b7"
        animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.8, 1.35, 0.8] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}
