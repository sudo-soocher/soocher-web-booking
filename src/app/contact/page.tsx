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
        a: "Absolutely. All data is encrypted and stored securely on Firebase. We never share your information with third parties.",
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
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="w-full p-4 bg-white shadow-md">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-primary font-semibold hover:opacity-80 transition-opacity"
                    >
                        <FaArrowLeft className="text-sm" />
                        <span className="text-xl font-bold">Soocher</span>
                    </button>
                    <Chip
                        startContent={<FaHeadset className="text-primary" />}
                        variant="flat"
                        color="primary"
                    >
                        24/7 Support
                    </Chip>
                </div>
            </header>

            {/* Hero */}
            <div className="relative bg-primary/10 py-16 overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/5 rounded-full pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative max-w-7xl mx-auto px-4 text-center"
                >
                    <div className="flex justify-center mb-5">
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="p-4 bg-primary/20 rounded-full"
                        >
                            <FaHeadset className="text-4xl text-primary" />
                        </motion.div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
                        We're Here to Help
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Have a question, feedback, or need support? Our team is just a
                        message away.
                    </p>
                </motion.div>
            </div>

            <main className="flex-1 py-14">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Contact Info Cards */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14"
                    >
                        {contactCards.map((card, idx) => (
                            <motion.div key={idx} variants={itemVariants}>
                                <Card
                                    className={`bg-gradient-to-br ${card.color} border border-gray-100 hover:shadow-lg transition-shadow`}
                                >
                                    <CardBody className="flex flex-col items-center text-center py-8 gap-3">
                                        <div className="p-3 bg-white/60 rounded-full shadow-sm">
                                            <card.icon className={`text-2xl ${card.iconColor}`} />
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg">
                                            {card.title}
                                        </h3>
                                        <p className="font-semibold text-gray-700">{card.detail}</p>
                                        <p className="text-sm text-gray-500">{card.sub}</p>
                                    </CardBody>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Main Content: Form + FAQ */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

                        {/* Contact Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="lg:col-span-3"
                        >
                            <Card className="shadow-md">
                                <CardBody className="p-8">
                                    <div className="flex items-center gap-3 mb-7">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <FaPaperPlane className="text-primary text-lg" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">
                                                Send Us a Message
                                            </h2>
                                            <p className="text-sm text-gray-500">
                                                Fill out the form and we'll get back to you shortly
                                            </p>
                                        </div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {submitted ? (
                                            <motion.div
                                                key="success"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex flex-col items-center justify-center py-16 gap-5"
                                            >
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 200,
                                                        damping: 15,
                                                    }}
                                                >
                                                    <FaCheckCircle className="text-6xl text-green-500" />
                                                </motion.div>
                                                <h3 className="text-2xl font-bold text-gray-800">
                                                    Message Received!
                                                </h3>
                                                <p className="text-gray-500 text-center max-w-xs">
                                                    Thank you for reaching out. We'll respond within 24
                                                    hours.
                                                </p>
                                                <Button
                                                    color="primary"
                                                    variant="flat"
                                                    onPress={() => {
                                                        setSubmitted(false);
                                                        setForm({
                                                            name: "",
                                                            email: "",
                                                            phone: "",
                                                            subject: "",
                                                            message: "",
                                                        });
                                                    }}
                                                >
                                                    Send Another Message
                                                </Button>
                                            </motion.div>
                                        ) : (
                                            <motion.form
                                                key="form"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                onSubmit={handleSubmit}
                                                className="space-y-5"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Input
                                                        label="Full Name"
                                                        name="name"
                                                        value={form.name}
                                                        onChange={handleChange}
                                                        isRequired
                                                        isInvalid={!!errors.name}
                                                        errorMessage={errors.name}
                                                        startContent={
                                                            <FaStethoscope className="text-gray-400 text-sm flex-shrink-0" />
                                                        }
                                                        placeholder="John Doe"
                                                    />
                                                    <Input
                                                        label="Phone Number"
                                                        name="phone"
                                                        value={form.phone}
                                                        onChange={handleChange}
                                                        isRequired
                                                        isInvalid={!!errors.phone}
                                                        errorMessage={errors.phone}
                                                        startContent={
                                                            <FaPhone className="text-gray-400 text-sm flex-shrink-0" />
                                                        }
                                                        placeholder="+91 98765 43210"
                                                    />
                                                </div>

                                                <Input
                                                    label="Email Address"
                                                    name="email"
                                                    type="email"
                                                    value={form.email}
                                                    onChange={handleChange}
                                                    isRequired
                                                    isInvalid={!!errors.email}
                                                    errorMessage={errors.email}
                                                    startContent={
                                                        <FaEnvelope className="text-gray-400 text-sm flex-shrink-0" />
                                                    }
                                                    placeholder="you@example.com"
                                                />

                                                <Input
                                                    label="Subject"
                                                    name="subject"
                                                    value={form.subject}
                                                    onChange={handleChange}
                                                    isRequired
                                                    isInvalid={!!errors.subject}
                                                    errorMessage={errors.subject}
                                                    placeholder="e.g. Booking issue, Refund request..."
                                                />

                                                <Textarea
                                                    label="Message"
                                                    name="message"
                                                    value={form.message}
                                                    onChange={handleChange}
                                                    isRequired
                                                    isInvalid={!!errors.message}
                                                    errorMessage={errors.message}
                                                    minRows={5}
                                                    placeholder="Describe your issue or question in detail..."
                                                />

                                                <Button
                                                    type="submit"
                                                    color="primary"
                                                    size="lg"
                                                    className="w-full font-semibold"
                                                    isLoading={submitting}
                                                    startContent={
                                                        !submitting && <FaPaperPlane className="text-sm" />
                                                    }
                                                >
                                                    {submitting ? "Sending..." : "Send Message"}
                                                </Button>
                                            </motion.form>
                                        )}
                                    </AnimatePresence>
                                </CardBody>
                            </Card>
                        </motion.div>

                        {/* FAQ */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="lg:col-span-2 flex flex-col gap-6"
                        >
                            {/* Response time badge */}
                            <Card className="bg-primary text-white shadow-md">
                                <CardBody className="flex flex-row items-center gap-4 p-5">
                                    <div className="p-3 bg-white/20 rounded-full">
                                        <FaClock className="text-2xl text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">Avg. Response Time</p>
                                        <p className="text-primary-100 text-sm">
                                            Under 4 hours on business days
                                        </p>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* FAQ Accordion */}
                            <Card className="shadow-md">
                                <CardBody className="p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-5">
                                        Frequently Asked Questions
                                    </h2>
                                    <div className="space-y-3">
                                        {faqs.map((faq, idx) => (
                                            <div
                                                key={idx}
                                                className="border border-gray-100 rounded-xl overflow-hidden"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedFaq(expandedFaq === idx ? null : idx)
                                                    }
                                                    className="w-full flex items-center justify-between p-4 text-left gap-2 hover:bg-gray-50 transition-colors"
                                                >
                                                    <span className="font-semibold text-gray-800 text-sm">
                                                        {faq.q}
                                                    </span>
                                                    <motion.span
                                                        animate={{ rotate: expandedFaq === idx ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="text-primary text-lg flex-shrink-0"
                                                    >
                                                        ▾
                                                    </motion.span>
                                                </button>
                                                <AnimatePresence>
                                                    {expandedFaq === idx && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.25 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
                                                                {faq.a}
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                </CardBody>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t py-8 mt-4">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Soocher. All rights reserved.
                    </p>
                    <div className="flex gap-4 text-sm text-gray-400">
                        <button
                            onClick={() => router.push("/")}
                            className="hover:text-primary transition-colors"
                        >
                            Home
                        </button>
                        <button
                            onClick={() => router.push("/bookings")}
                            className="hover:text-primary transition-colors"
                        >
                            My Bookings
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
