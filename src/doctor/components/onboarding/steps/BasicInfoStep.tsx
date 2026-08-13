"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaClock, FaMapMarkerAlt, FaSearch, FaShieldAlt, FaUserMd } from "react-icons/fa";
import { Autocomplete, AutocompleteItem, Input, Select, SelectItem } from "@heroui/react";
import { ErrorBanner, Field, StepShell, autocompleteClassNames, inputClassNames, selectClassNames } from "@/doctor/components/onboarding/shell";
import { ImageUploader } from "@/doctor/components/onboarding/inputs";
import { useAuth } from "@/doctor/lib/auth";
import { COUNTRIES, STEPS, getNextStepSlug, saveStep, uploadDoctorFile } from "@/doctor/lib/onboarding";
import type { Gender } from "@/doctor/types/doctor";

const GENDERS: { key: Gender; label: string }[] = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
  { key: "prefer-not-to-say", label: "Prefer not to say" },
];

/**
 * IANA timezones. `Intl.supportedValuesOf("timeZone")` returns only canonical
 * zone names (e.g. Asia/Calcutta), but most modern systems — including
 * `resolvedOptions().timeZone` — emit the renamed aliases (Asia/Kolkata,
 * Asia/Kathmandu, etc.). We merge in those aliases so the dropdown and the
 * browser-detected default agree.
 */
const TIMEZONE_ALIASES = [
  "Asia/Kolkata", "Asia/Kathmandu", "Asia/Yangon", "Asia/Ho_Chi_Minh",
  "Asia/Saigon", "Africa/Asmara", "America/Argentina/Buenos_Aires",
  "America/Argentina/Catamarca", "America/Argentina/Cordoba",
  "America/Argentina/Jujuy", "America/Argentina/La_Rioja",
  "America/Argentina/Mendoza", "America/Argentina/Rio_Gallegos",
  "America/Argentina/Salta", "America/Argentina/San_Juan",
  "America/Argentina/San_Luis", "America/Argentina/Tucuman",
  "America/Argentina/Ushuaia", "America/Indiana/Indianapolis",
  "America/Kentucky/Louisville", "America/Atikokan", "America/Nuuk",
  "Atlantic/Faroe", "Europe/Kyiv", "Pacific/Chuuk", "Pacific/Pohnpei",
];
const TIMEZONES: string[] = (() => {
  type IntlExt = typeof Intl & { supportedValuesOf?: (k: string) => string[] };
  const canonical = (Intl as IntlExt).supportedValuesOf?.("timeZone") ?? [];
  const merged = new Set<string>([...canonical, ...TIMEZONE_ALIASES, "UTC"]);
  return [...merged].sort((a, b) => a.localeCompare(b));
})();

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function BasicInfoStep() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const meta = STEPS[0];

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>();
  const [country, setCountry] = useState("IN");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState<string>(detectTimezone);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName((profile.fullName as string) || "");
    setDob((profile.dob as string) || "");
    setGender(((profile.gender as Gender) || "") as Gender | "");
    setProfilePhotoUrl(profile.profilePhotoUrl as string | undefined);
    setCountry((profile.country as string) || "IN");
    setState((profile.state as string) || "");
    setCity((profile.city as string) || "");
    setTimezone((profile.timezone as string) || detectTimezone());
  }, [profile]);

  const handleNext = async () => {
    setError(null);
    if (!fullName.trim()) return setError("Full name is required.");
    if (!dob) return setError("Date of birth is required.");
    if (!gender) return setError("Select your gender.");
    if (!country) return setError("Select your country.");
    if (!state.trim()) return setError("State / province is required.");
    if (!city.trim()) return setError("City is required.");
    if (!timezone) return setError("Select your timezone.");
    if (!user) return;
    await saveStep(
      user.uid,
      {
        fullName: fullName.trim(),
        dob,
        gender,
        profilePhotoUrl,
        country,
        state: state.trim(),
        city: city.trim(),
        timezone,
      },
      2
    );
    await refreshProfile();
    const next = getNextStepSlug(meta.slug);
    if (next) router.push(`/doc/onboarding/${next}`);
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <div className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50/70 p-3.5 sm:p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm">
          <FaShieldAlt className="text-sm" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Your information stays private</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">We use these details to verify your identity and personalise your doctor profile.</p>
        </div>
      </div>

      <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
            <FaUserMd />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Personal details</h2>
            <p className="text-xs text-slate-500">Use the same details as your licence.</p>
          </div>
        </div>

        <div className="space-y-5">
          <Field label="Profile photo">
            <ImageUploader
              value={profilePhotoUrl}
              onChange={setProfilePhotoUrl}
              upload={(f) => uploadDoctorFile(user!.uid, "profile-photo", f)}
            />
          </Field>

          <Field label="Full name (as on medical licence)" required>
            <Input
              value={fullName}
              onValueChange={setFullName}
              variant="bordered"
              radius="lg"
              size="lg"
              placeholder="Dr. Anika Sharma"
              classNames={inputClassNames}
            />
          </Field>

          <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Date of birth" required>
              <Input
                type="date"
                value={dob}
                onValueChange={setDob}
                variant="bordered"
                radius="lg"
                size="lg"
                classNames={inputClassNames}
              />
            </Field>
            <Field label="Gender" required>
              <Select
                selectedKeys={gender ? [gender] : []}
                onChange={(e) => setGender(e.target.value as Gender)}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="Select"
                classNames={selectClassNames}
              >
                {GENDERS.map((g) => (
                  <SelectItem key={g.key}>{g.label}</SelectItem>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FaMapMarkerAlt />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Location</h2>
            <p className="text-xs text-slate-500">Helps patients find care near them.</p>
          </div>
        </div>

        <div className="space-y-5">
          <Field label="Country" required>
            <Autocomplete
              defaultItems={COUNTRIES}
              selectedKey={country || null}
              onSelectionChange={(key) => setCountry((key as string | null) ?? "")}
              variant="bordered"
              radius="lg"
              size="lg"
              placeholder="Type to search country…"
              menuTrigger="input"
              allowsCustomValue={false}
              startContent={<FaSearch className="text-slate-400" />}
              inputProps={{ classNames: inputClassNames }}
              classNames={autocompleteClassNames}
            >
              {(c) => (
                <AutocompleteItem key={c.code} textValue={c.name}>
                  {c.name}
                </AutocompleteItem>
              )}
            </Autocomplete>
          </Field>

          <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="State / Province / Region" required>
              <Input
                value={state}
                onValueChange={setState}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="e.g. Maharashtra"
                classNames={inputClassNames}
              />
            </Field>
            <Field label="City" required>
              <Input
                value={city}
                onValueChange={setCity}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="e.g. Mumbai"
                classNames={inputClassNames}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <FaClock />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Local time</h2>
            <p className="text-xs text-slate-500">Keeps your consultation schedule accurate.</p>
          </div>
        </div>

        <Field label="Timezone" required hint="We convert availability to each patient's local time.">
          <Autocomplete
            defaultItems={TIMEZONES.map((tz) => ({ key: tz }))}
            selectedKey={timezone || null}
            onSelectionChange={(key) => setTimezone((key as string | null) ?? "")}
            variant="bordered"
            radius="lg"
            size="lg"
            placeholder="Search timezone (e.g. Kolkata)…"
            menuTrigger="input"
            allowsCustomValue={false}
            startContent={<FaSearch className="text-slate-400" />}
            inputProps={{ classNames: inputClassNames }}
            classNames={autocompleteClassNames}
          >
            {(item) => (
              <AutocompleteItem key={item.key} textValue={item.key}>
                {item.key}
              </AutocompleteItem>
            )}
          </Autocomplete>
        </Field>
      </section>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
