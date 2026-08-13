# English / Malayalam language switcher

**Date:** 2026-08-13
**Status:** Approved

## Goal

A language control that opens a popup offering **English** and **മലയാളം**, and switches the
app's interface text to the chosen language.

## Scope

**In scope — UI text only.** Buttons, labels, headings, form fields, placeholders, empty
states, and error messages across the app.

**Explicitly out of scope.** Everything sourced from Firestore stays in English:

- Doctor names and bios (`aboutMe`)
- Speciality names (`Cardiology`, `General Physician (M.B.B.S)`, …)
- City and state names
- Doctor-authored content of any kind

Translating those needs either Malayalam fields on every doctor document (data entry by
doctors) or a live translation API. Both are separate projects.

## Architecture

Three files under `src/i18n/`, no third-party library:

| File | Purpose |
| --- | --- |
| `en.json` | key → English. Source of truth for the key set. |
| `ml.json` | key → Malayalam. The artefact a Malayalam speaker reviews. |
| `LanguageProvider.tsx` | Context, `useTranslation()`, `useLanguage()`. |

### Why not next-intl / react-i18next

Both are built around URL-based locale routing and server components. This app stores the
choice in `localStorage` with no URL change, and every page is already `"use client"`. A
library would add roughly 40 kB and work against that setup. The provider is ~60 lines.

### API

```tsx
const { t } = useTranslation();
<Button>{t("home.bookConsultation")}</Button>
<p>{t("otp.remaining", { count: 3 })}</p>   // {param} interpolation
```

A missing key falls back to the English string, then to the key itself. It never renders
blank and never renders a raw key to a user when English exists.

### Hydration

Every route is statically prerendered, so the server HTML is always English — the server
cannot read `localStorage`. Rendering Malayalam on the client's first pass would produce a
hydration mismatch on every text node. This is the same constraint already documented in
`src/app/page.tsx` for the specialities cache.

Resolution: hydrate in English, then apply the stored language inside a
**`useLayoutEffect`**, which runs before the browser paints. A Malayalam user never sees an
English frame. A `useIsomorphicLayoutEffect` wrapper keeps it from warning during SSR.

This is the accepted cost of keeping URLs unchanged.

### Persistence

`localStorage` key `soocher_lang`, values `"en"` | `"ml"`. `<html lang>` is updated on
change for correct font selection and screen-reader pronunciation.

## Placement

`<LanguageSwitcher />` — globe icon opening a NextUI `Dropdown` (already used for the
profile menu, so no new primitive):

- Mobile top bar
- Desktop navbar
- Login page — so a first-time user can switch before reading English to sign in
- Profile page, as a `Language` row in the settings card

## Font

**Noto Sans Malayalam** via `next/font/google`, applied only when `lang === "ml"`:

```css
html[lang="ml"] body { font-family: var(--font-malayalam), system-ui, sans-serif; }
```

Android and iOS ship Malayalam glyphs, but desktop Windows frequently does not, and the
failure mode is rows of empty boxes. One subsetted file, downloaded only by Malayalam users.

## Translation review

Malayalam is drafted here and **reviewed by a Malayalam speaker before release**. Medically
sensitive keys are grouped and marked with `⚠ REVIEW` in `ml.json`:

- Allergies, regular medications, medical conditions
- Consent and booking terms
- Payment and refund copy

Machine-drafted medical terminology going live unreviewed is the main risk in this feature,
and this grouping is what makes the review tractable.

## Delivery

**Phase 1** — provider, switcher, font, `en.json` / `ml.json`, and conversion of:
bottom nav, home, doctors, bookings, profile, login.

**Phase 2** — doctor detail, booking-complete, contact, speciality, video-call, and shared
components (Footer, DoctorCard, forms, shimmers).

The split exists so the approach can be judged on real screens before the remaining ~90
string sites are converted.

## Non-goals

- No URL locale prefixes (`/ml/...`), so no routing refactor and no change to the
  `/native-auth` WebView entry flow.
- No RTL work — Malayalam is left-to-right.
- No language detection from device locale. The default is English until the user chooses.
