/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { FaStethoscope, FaEnvelope, FaPhone, FaMapMarkerAlt, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";
import { Link } from "@nextui-org/react";

export const Footer = () => {
    return (
        <footer className="hidden md:block bg-white border-t border-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    © 2026 Soocher Healthcare. All rights reserved.
                </p>
                <div className="flex items-center gap-6">
                    <Link href="/contact" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Contact Us</Link>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.16em]">
                        Secure consultations and protected data
                    </p>
                </div>
            </div>
        </footer>
    );
};
