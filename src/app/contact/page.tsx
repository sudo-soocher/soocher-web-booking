"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardBody,
    Input,
    Textarea,
    Button,
    Chip,
} from "@nextui-org/react";
import {
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaArrowLeft,
    FaPaperPlane,
    FaCheckCircle,
    FaClock,
    FaHeadset,
    FaStethoscope,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const contactCards = [
    {
        icon: FaPhone,
        title: "Call Us",
        detail: "+91 98765 43210",
        sub: "Mon – Sat, 9 AM – 8 PM IST",
        color: "from-blue-500/10 to-blue-600/10",
        iconColor: "text-blue-500",
    },
    {
        icon: FaEnvelope,
        title: "Email Us",
        detail: "support@soocher.com",
        sub: "We reply within 24 hours",
        color: "from-primary/10 to-primary/20",
        iconColor: "text-primary",
    },
    {
        icon: FaMapMarkerAlt,
        title: "Our Office",
        detail: "F5, Park Centre, KSITIL SEZ, Palazhi",
        sub: "Pantheeramkavu, Kozhikode, Kerala 673016",
        color: "from-green-500/10 to-green-600/10",
        iconColor: "text-green-500",
    },
];

const faqs = [
    {
        q: "How do I book a consultation?",
        a: "Browse our specialities on the home page, pick a doctor, choose an available slot, and pay securely via Razorpay.",
    },
    {
        q: "Can I reschedule or cancel my booking?",
        a: "Yes! Free cancellation is available. Visit My Bookings and select the consultation to manage it.",
    },
    {
        q: "How does the video consultation work?",
        a: "After booking you receive a Google Meet link via push notification and on the booking-complete page. Join at your scheduled time.",
    },
    {
        q: "Is my health data secure?",
        a: "Absolutely. All data is encrypted and stored securely. We never share your information with third parties.",
    },
];

export default function ContactPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Partial<typeof form>>({});
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        // Clear error for that field as user types
        if (errors[e.target.name as keyof typeof form]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const newErrors: Partial<typeof form> = {};
        if (!form.name.trim()) newErrors.name = "Full name is required";
        if (!form.phone.trim()) newErrors.phone = "Phone number is required";
        if (!form.email.trim()) newErrors.email = "Email address is required";
        if (!form.subject.trim()) newErrors.subject = "Subject is required";
        if (!form.message.trim()) newErrors.message = "Message is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        // Simulate network request (replace with real API / Firestore write)
        await new Promise((r) => setTimeout(r, 1500));
        setSubmitting(false);
        setSubmitted(true);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
            {/* Navbar - Glass Effect */}
            <header className="sticky top-0 z-40 w-full px-6 py-4">
                <nav className="max-w-7xl mx-auto flex justify-between items-center glass-effect rounded-[24px] px-6 py-3 border border-white/40 shadow-sm">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <FaStethoscope className="text-white text-xl" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Soocher</h1>
                    </div>
                    <Button
                        variant="flat"
                        size="sm"
                        className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                        startContent={<FaArrowLeft className="text-xs" />}
                        onPress={() => router.push("/")}
                    >
                        Back
                    </Button>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative pt-12 pb-24 px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-10">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-primary blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary blur-[100px] rounded-full" />
                </div>

                <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex p-4 bg-white rounded-[32px] shadow-xl shadow-primary/5 text-primary"
                    >
                        <FaHeadset className="text-4xl" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight"
                    >
                        How can we <span className="text-primary italic">help you?</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed"
                    >
                        Whether you have a question about our services, need technical support, or just want to share feedback, we're here for you.
                    </motion.p>
                </div>
            </section>

            <main className="flex-1 pb-24 px-6">
                <div className="max-w-7xl mx-auto space-y-24">
                    {/* Contact Channels */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        {contactCards.map((card, idx) => (
                            <motion.div key={idx} variants={itemVariants} className="premium-card p-10 flex flex-col items-center text-center space-y-6 border-none ring-1 ring-slate-100">
                                <div className={`w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center text-2xl ${card.iconColor.replace('text-', 'text-opacity-80 text-')}`}>
                                    <card.icon />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900">{card.title}</h3>
                                    <p className="text-primary font-bold">{card.detail}</p>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest leading-loose">
                                        {card.sub}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
                        {/* Form Section */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-10"
                        >
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Drop us a line</h2>
                                <p className="text-slate-500 font-medium">Rest assured, we read every single message.</p>
                            </div>

                            <AnimatePresence mode="wait">
                                {submitted ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="premium-card p-12 text-center space-y-6"
                                    >
                                        <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto text-4xl">
                                            <FaCheckCircle />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black text-slate-900">Successfully Sent</h3>
                                            <p className="text-slate-500 font-medium">Your message is on its way to our team. Expect a response soon!</p>
                                        </div>
                                        <Button
                                            color="primary"
                                            size="lg"
                                            variant="flat"
                                            className="rounded-full px-8 font-bold"
                                            onPress={() => setSubmitted(false)}
                                        >
                                            Send Another
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onSubmit={handleSubmit}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Input
                                                label="Full Name"
                                                name="name"
                                                variant="bordered"
                                                radius="lg"
                                                value={form.name}
                                                onChange={handleChange}
                                                isInvalid={!!errors.name}
                                                errorMessage={errors.name}
                                                classNames={{
                                                    inputWrapper: "border-slate-200 hover:border-primary/50 focus-within:!border-primary",
                                                    label: "font-bold text-slate-400"
                                                }}
                                            />
                                            <Input
                                                label="Phone"
                                                name="phone"
                                                variant="bordered"
                                                radius="lg"
                                                value={form.phone}
                                                onChange={handleChange}
                                                isInvalid={!!errors.phone}
                                                errorMessage={errors.phone}
                                                classNames={{
                                                    inputWrapper: "border-slate-200 hover:border-primary/50 focus-within:!border-primary",
                                                    label: "font-bold text-slate-400"
                                                }}
                                            />
                                        </div>
                                        <Input
                                            label="Email Address"
                                            name="email"
                                            variant="bordered"
                                            radius="lg"
                                            value={form.email}
                                            onChange={handleChange}
                                            isInvalid={!!errors.email}
                                            errorMessage={errors.email}
                                            classNames={{
                                                inputWrapper: "border-slate-200 hover:border-primary/50 focus-within:!border-primary",
                                                label: "font-bold text-slate-400"
                                            }}
                                        />
                                        <Input
                                            label="Subject"
                                            name="subject"
                                            variant="bordered"
                                            radius="lg"
                                            value={form.subject}
                                            onChange={handleChange}
                                            isInvalid={!!errors.subject}
                                            errorMessage={errors.subject}
                                            classNames={{
                                                inputWrapper: "border-slate-200 hover:border-primary/50 focus-within:!border-primary",
                                                label: "font-bold text-slate-400"
                                            }}
                                        />
                                        <Textarea
                                            label="Your Message"
                                            name="message"
                                            variant="bordered"
                                            radius="lg"
                                            minRows={4}
                                            value={form.message}
                                            onChange={handleChange}
                                            isInvalid={!!errors.message}
                                            errorMessage={errors.message}
                                            classNames={{
                                                inputWrapper: "border-slate-200 hover:border-primary/50 focus-within:!border-primary",
                                                label: "font-bold text-slate-400"
                                            }}
                                        />
                                        <Button
                                            type="submit"
                                            color="primary"
                                            size="lg"
                                            className="w-full rounded-2xl h-16 text-lg font-black shadow-xl shadow-primary/20"
                                            isLoading={submitting}
                                            startContent={!submitting && <FaPaperPlane className="text-sm opacity-60" />}
                                        >
                                            Release Message
                                        </Button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* FAQ Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-10"
                        >
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quick answers</h2>
                                <p className="text-slate-500 font-medium">Common questions that might solve your query instantly.</p>
                            </div>

                            <div className="space-y-4">
                                {faqs.map((faq, idx) => (
                                    <div
                                        key={idx}
                                        className="premium-card p-2 border-none ring-1 ring-slate-100 overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                            className="w-full flex items-center justify-between p-6 text-left"
                                        >
                                            <span className="font-bold text-slate-700">{faq.q}</span>
                                            <motion.div
                                                animate={{
                                                    rotate: expandedFaq === idx ? 180 : 0,
                                                    color: expandedFaq === idx ? "#2e6dd4" : "#94a3b8"
                                                }}
                                                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center"
                                            >
                                                <span className="text-xs font-black">↓</span>
                                            </motion.div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedFaq === idx && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="px-6 pb-6"
                                                >
                                                    <p className="text-slate-500 font-medium leading-relaxed">
                                                        {faq.a}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 bg-primary rounded-[32px] text-white space-y-4 shadow-2xl shadow-primary/20">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-xl">
                                    <FaClock />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-xl tracking-tight">Rapid Response</h4>
                                    <p className="text-white/80 text-sm font-medium">Our average response time is under 4 hours on business days.</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            <footer className="py-12 border-t border-slate-100 bg-white">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 grayscale opacity-50">
                        <FaStethoscope className="text-primary" />
                        <span className="font-bold text-slate-900 tracking-tight text-lg">Soocher</span>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">
                        © {new Date().getFullYear()} Soocher. All rights reserved. Built with elegance.
                    </p>
                    <div className="flex gap-8 text-sm font-bold text-slate-400">
                        <button onClick={() => router.push("/")} className="hover:text-primary transition-colors">Home</button>
                        <button onClick={() => router.push("/bookings")} className="hover:text-primary transition-colors">My Bookings</button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
