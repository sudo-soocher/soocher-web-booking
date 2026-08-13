# Malayalam translation review

Every string in `ml.json` was drafted by an AI and **has not been reviewed by a Malayalam
speaker**. This file exists so a reviewer can start where a mistake would matter most.

Edit `ml.json` directly. A key deleted or left blank there falls back to the English string,
so partial review is safe to ship.

## ⚠ Priority 1 — medical

A wrong word here can change what a patient tells their doctor. Review these first.

| Key | English | Malayalam draft |
| --- | --- | --- |
| `profile.medicalInfo` | Medical information | മെഡിക്കൽ വിവരങ്ങൾ |
| `profile.allergies` | Allergies | അലർജികൾ |
| `profile.allergiesPlaceholder` | e.g. Penicillin, peanuts | ഉദാ. പെൻസിലിൻ, നിലക്കടല |
| `profile.medications` | Regular medications | പതിവായി കഴിക്കുന്ന മരുന്നുകൾ |
| `profile.medicationsPlaceholder` | e.g. Metformin 500mg, twice daily | ഉദാ. മെറ്റ്ഫോർമിൻ 500mg, ദിവസത്തിൽ രണ്ടുതവണ |
| `profile.conditions` | Medical conditions | രോഗാവസ്ഥകൾ |
| `profile.conditionsPlaceholder` | e.g. Type 2 diabetes, hypertension | ഉദാ. ടൈപ്പ് 2 പ്രമേഹം, ഉയർന്ന രക്തസമ്മർദ്ദം |

Specific doubts to settle:

- **`profile.conditions`** — `രോഗാവസ്ഥകൾ` reads as "disease states". A clinician may prefer
  `ആരോഗ്യ പ്രശ്നങ്ങൾ` ("health problems") as plainer patient-facing language.
- **`profile.medications`** — the draft expands to "medicines taken regularly", which is
  longer than the English. Check it does not wrap badly on a narrow phone.
- Drug and condition names in the placeholders are transliterated, not translated. Confirm
  that matches how Kerala patients actually name them.

## ⚠ Priority 2 — money and consent

None of these strings exist yet — booking, payment and refund copy lands in **Phase 2**.
This section is a placeholder so the reviewer knows more is coming.

## Priority 3 — everything else

Navigation, headings, empty states. A clumsy phrase here is cosmetic.

Two word choices worth a native speaker's opinion, because they repeat throughout:

- **"speciality" → `വിഭാഗം`** ("category" / "division"). Common in Kerala hospital signage,
  but `സ്പെഷ്യാലിറ്റി` is also widely understood. Whichever you pick, it appears in roughly
  a dozen keys — change them together.
- **"specialist" → `വിദഗ്ധൻ`** ("expert"). Grammatically masculine. Malayalam has no neutral
  agent noun here; `വിദഗ്ധർ` (plural) is used wherever possible for that reason. Check the
  singular uses in `doctors.*` and `bookings.findSpecialist` read acceptably.

## Not translated by design

Doctor names, doctor bios, speciality names, cities and states come from Firestore and stay
in English. See the design doc for why.
