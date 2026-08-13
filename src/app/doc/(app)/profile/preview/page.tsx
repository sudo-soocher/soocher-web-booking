"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Chip } from "@heroui/react";
import {
  FaArrowLeft,
  FaEye,
  FaFilePdf,
  FaGraduationCap,
  FaIdCard,
  FaLanguage,
  FaMedal,
  FaMoneyBillWave,
  FaPhone,
  FaRegClock,
  FaStethoscope,
  FaTools,
  FaUser,
  FaUserMd,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import { useAuth } from "@/doctor/lib/auth";
import type {
  AchievementItem,
  DayKey,
  EducationItem,
  ExperienceItem,
  ExpertiseItem,
  WeeklyTimeSlots,
} from "@/doctor/types/doctor";

const DAY_ORDER: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABEL: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const ACHIEVEMENT_LABEL: Record<string, string> = {
  certification: "Certification",
  award: "Award",
  media: "Media feature",
  publication: "Publication",
  talk: "Conference talk",
};

function mask(value: string | undefined, keepStart = 4, keepEnd = 4): string {
  if (!value) return "—";
  if (value.length <= keepStart + keepEnd) return value;
  return `${value.slice(0, keepStart)}${"•".repeat(Math.max(4, value.length - keepStart - keepEnd))}${value.slice(-keepEnd)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtYears(from: number | "" | undefined, to: number | "" | undefined, isCurrent?: boolean) {
  const f = from ? String(from) : "—";
  const t = isCurrent ? "Present" : to ? String(to) : "—";
  return `${f} – ${t}`;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: IconType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="premium-card p-5 md:p-7"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-50 text-primary">
          <Icon className="text-sm" />
        </div>
        <h2 className="text-base font-black tracking-tight text-slate-900 md:text-lg">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900 md:text-base">
        {value || <span className="text-slate-400">Not provided</span>}
      </div>
    </div>
  );
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  const c = cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return <div className={`grid grid-cols-1 gap-4 ${c} md:gap-5`}>{children}</div>;
}

function Chips({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-sm text-slate-400">Not provided</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span
          key={i}
          className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary"
        >
          {i}
        </span>
      ))}
    </div>
  );
}

function ListEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

export default function ProfilePreviewPage() {
  const { profile, user, status } = useAuth();
  const p = profile as Record<string, unknown> | null;

  const fullName = (p?.fullName as string) || "—";
  const photo = p?.profilePhotoUrl as string | undefined;
  const primarySpec = (p?.primarySpeciality as string) || "—";
  const subs = ((p?.subSpecialities as string[]) || []);
  const years = p?.yearsOfExperience as number | undefined;
  const expertise = ((p?.expertiseItems as ExpertiseItem[]) || []);
  const education = ((p?.education as EducationItem[]) || []);
  const workExp = ((p?.workExperience as ExperienceItem[]) || []);
  const achievements = ((p?.achievements as AchievementItem[]) || []);
  const languages = ((p?.languages as string[]) || []);
  const slots = (p?.timeSlots as WeeklyTimeSlots | undefined);
  const docUrl = p?.licenceDocUrl as string | undefined;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/doc/profile"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-600 shadow-sm hover:text-primary"
        >
          <FaArrowLeft />
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700">
          <FaEye className="text-[10px]" />
          View only
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5"
      >
        <Chip variant="flat" color="primary" className="mb-2">
          Submitted to review
        </Chip>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
          My submission
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          This is exactly what our team is reviewing. Edits will be available once you&apos;re verified.
        </p>
      </motion.div>

      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="premium-card mt-6 flex items-center gap-4 p-5 md:p-6"
      >
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-primary-100 md:h-24 md:w-24">
          {photo ? (
            <Image src={photo} alt={fullName} fill className="object-cover" sizes="96px" />
          ) : (
            <div className="grid h-full w-full place-items-center text-primary">
              <FaUserMd className="text-2xl" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-black text-slate-900 md:text-xl">
            Dr. {fullName}
          </div>
          <div className="truncate text-xs text-primary md:text-sm">{primarySpec}</div>
          <div className="mt-1 truncate text-[11px] text-slate-500 md:text-xs">
            {[p?.city, p?.state].filter(Boolean).join(", ") || "Location not set"}
            {years != null && ` · ${years} yrs experience`}
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      <div className="mt-6 space-y-4 md:space-y-5">
        {/* O1 Basic info */}
        <Section icon={FaUser} title="Basic info">
          <Grid>
            <Field label="Full name" value={fullName} />
            <Field label="Date of birth" value={fmtDate(p?.dob as string)} />
            <Field
              label="Gender"
              value={
                p?.gender ? (p.gender as string).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null
              }
            />
            <Field label="Country" value="India" />
            <Field label="State" value={(p?.state as string) || null} />
            <Field label="City" value={(p?.city as string) || null} />
          </Grid>
        </Section>

        {/* O2 Contact */}
        <Section icon={FaPhone} title="Contact">
          <Grid>
            <Field label="Email" value={(p?.email as string) || user?.email} />
            <Field
              label="Mobile"
              value={p?.mobile ? `+91 ${p.mobile as string}` : null}
            />
            <Field
              label="WhatsApp"
              value={
                p?.whatsapp
                  ? `+91 ${p.whatsapp as string}${p?.whatsappSameAsMobile ? " (same as mobile)" : ""}`
                  : null
              }
            />
            <Field label="Clinic landline" value={(p?.clinicLandline as string) || null} />
          </Grid>
        </Section>

        {/* O3 Speciality */}
        <Section icon={FaStethoscope} title="Speciality">
          <div className="space-y-5">
            <Grid>
              <Field label="Primary speciality" value={primarySpec} />
              <Field label="Years of experience" value={years != null ? `${years} years` : null} />
            </Grid>
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Sub-specialities
              </div>
              <Chips items={subs} />
            </div>
          </div>
        </Section>

        {/* O4 Expertise & procedures */}
        <Section icon={FaTools} title="Expertise & procedures">
          {expertise.length === 0 ? (
            <ListEmpty text="No expertise or procedures added." />
          ) : (
            <div className="space-y-2">
              {expertise.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                >
                  <span className="text-sm font-bold text-slate-900">{e.name}</span>
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {e.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* O5 About */}
        <Section icon={FaUserMd} title="About">
          <div className="space-y-4">
            <Field
              label="Short bio"
              value={
                p?.bio ? <p className="leading-relaxed text-slate-700">{String(p.bio)}</p> : null
              }
            />
            {Boolean(p?.consultationApproach) && (
              <Field
                label="Consultation approach"
                value={
                  <p className="leading-relaxed text-slate-700">
                    {String(p?.consultationApproach)}
                  </p>
                }
              />
            )}
          </div>
        </Section>

        {/* O6 Licence */}
        <Section icon={FaIdCard} title="Medical licence">
          <div className="space-y-5">
            <Grid>
              <Field label="Medical council" value={(p?.medicalCouncil as string) || null} />
              <Field label="Registration number" value={(p?.registrationNumber as string) || null} />
              <Field label="Registration date" value={fmtDate(p?.registrationDate as string)} />
              <Field label="Valid until" value={fmtDate(p?.validUntil as string)} />
              <Field label="Aadhaar" value={mask(p?.aadhaarNumber as string, 4, 4)} />
              <Field
                label="Licence document"
                value={
                  docUrl ? (
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-100"
                    >
                      <FaFilePdf />
                      View document
                    </a>
                  ) : null
                }
              />
            </Grid>
          </div>
        </Section>

        {/* O7 Education */}
        <Section icon={FaGraduationCap} title="Education & training">
          {education.length === 0 ? (
            <ListEmpty text="No qualifications added." />
          ) : (
            <div className="space-y-3">
              {education.map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="text-sm font-bold text-slate-900">{e.degree || "—"}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{e.institution || "—"}</div>
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {fmtYears(e.fromYear, e.toYear)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* O8 Experience */}
        <Section icon={FaUserMd} title="Work experience">
          {workExp.length === 0 ? (
            <ListEmpty text="No positions added." />
          ) : (
            <div className="space-y-3">
              {workExp.map((w) => (
                <div key={w.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{w.role || "—"}</div>
                      <div className="mt-0.5 text-xs text-slate-600">{w.organisation || "—"}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {[w.city, w.state].filter(Boolean).join(", ") || "—"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {fmtYears(w.fromYear, w.toYear, w.isCurrent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* O9 Achievements */}
        <Section icon={FaMedal} title="Achievements">
          {achievements.length === 0 ? (
            <ListEmpty text="No achievements added." />
          ) : (
            <div className="space-y-3">
              {achievements.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{a.title || "—"}</div>
                      {a.description && (
                        <div className="mt-1 text-xs text-slate-600">{a.description}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {ACHIEVEMENT_LABEL[a.type] || a.type}
                      </div>
                      {a.year !== "" && a.year != null && (
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">
                          {a.year}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* O10 Languages */}
        <Section icon={FaLanguage} title="Languages spoken">
          <Chips items={languages} />
        </Section>

        {/* O11 Schedule */}
        <Section icon={FaRegClock} title="Consultation schedule">
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Available days
              </div>
              <div className="flex flex-wrap gap-2">
                {DAY_ORDER.map((k) => {
                  const on = slots?.[k]?.enabled;
                  return (
                    <span
                      key={k}
                      className={`min-w-[48px] rounded-xl px-3 py-1.5 text-center text-xs font-bold ${
                        on
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-400 line-through"
                      }`}
                    >
                      {DAY_LABEL[k]}
                    </span>
                  );
                })}
              </div>
            </div>
            <Grid cols={3}>
              <Field
                label="Slot duration"
                value={p?.slotDuration != null ? `${p.slotDuration} min` : null}
              />
              <Field
                label="Break between slots"
                value={
                  p?.breakBetweenSlots != null ? `${p.breakBetweenSlots} min` : null
                }
              />
            </Grid>
          </div>
        </Section>

        {/* O12 Finance */}
        <Section icon={FaMoneyBillWave} title="Finance">
          <div className="space-y-5">
            <Grid cols={3}>
              <Field
                label="Video consult fee"
                value={p?.videoConsultFee != null ? `₹ ${p.videoConsultFee}` : null}
              />
              <Field
                label="Chat fee"
                value={p?.chatFee != null ? `₹ ${p.chatFee}` : null}
              />
              <Field
                label="Follow-up fee"
                value={p?.followUpFee != null ? `₹ ${p.followUpFee}` : null}
              />
            </Grid>
            <Grid>
              <Field
                label="Payout method"
                value={p?.payoutMethod ? (p.payoutMethod as string).toUpperCase() : null}
              />
              {p?.payoutMethod === "upi" ? (
                <Field label="UPI ID" value={(p?.upiId as string) || null} />
              ) : p?.payoutMethod === "bank" ? (
                <>
                  <Field
                    label="Bank account"
                    value={mask(p?.bankAccountNumber as string, 2, 4)}
                  />
                  <Field label="IFSC" value={(p?.bankIfsc as string) || null} />
                  <Field label="Bank name" value={(p?.bankName as string) || null} />
                </>
              ) : null}
              <Field label="PAN" value={mask(p?.panNumber as string, 2, 1)} />
            </Grid>
          </div>
        </Section>
      </div>

      {/* Footer note */}
      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-5 text-center text-xs text-slate-500">
        Need to change something? You&apos;ll be able to edit your full profile once you&apos;re verified.
        <br />
        Status: <span className="font-bold text-amber-600">{status}</span>
      </div>
    </div>
  );
}
