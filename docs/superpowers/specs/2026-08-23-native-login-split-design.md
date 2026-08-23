# Native login split: explicit user/doctor choice + faster doctor handoff

## Goal

The Flutter app ("Soocher Doctor", at `SOOCHER-APP-FLUTTER/soocher-doctor-app-main`)
currently guesses patient-vs-doctor after sign-in by reading Firestore
`Users.type`, defaulting to doctor when unresolved. There is no UI choice.
Doctor login is also noticeably slower than patient login because the doctor
handoff page has no session-caching fast path.

This change:
1. Adds an explicit "Login" (default, patient) vs "Doctor Login" choice to the
   Flutter login screen, replacing the silent post-auth guess.
2. Ports the existing patient fast-path caching (`native-session.ts`) to the
   doctor native-auth handoff page, so returning doctors redirect as fast as
   returning patients do.
3. Leaves `/api/auth/send-otp`, `/api/auth/verify-otp`, and all
   `claimDoctorAccount`/`resolveDestination` safety guards untouched.

The web app already exposes two role-specific native-login endpoints
(`/api/native-auth-token`, `/api/doc/native-auth-token`) — no new endpoints
are created; this spec optimizes the existing pair and the pages they hand
off to.

## Non-goals

- No change to the unified WhatsApp OTP web login (`/login`, `send-otp`,
  `verify-otp`).
- No replacement of the WebView shell with native screens (out of scope per
  discussion — this is a handoff-speed fix, not an architecture rewrite).
- No change to `claimDoctorAccount`'s guard rules (must not overwrite an
  existing non-doctor account) — this is the exact rule that broke the prior
  doctor/patient split, and it stays as-is.

## Web app changes (`SOOCHER-USER-WEB/soocher-web-booking`)

### `src/app/doc/native-auth/page.tsx`

Add the same session-cache fast path already implemented in
`src/app/native-auth/page.tsx`:

- On mount, synchronously check `readNativeSession()`/`readNativeDestination()`
  from `src/lib/native-session.ts`. If a cached doctor destination exists and
  matches the token's uid (via `uidFromCustomToken`), `router.replace()`
  immediately, then heal the real Firebase session in the background
  (`waitForPersistedUser` → `signInWithCustomToken` if needed).
- On the slow/first-login path, after `resolveDestination`/`claimDoctorAccount`
  resolves a destination, call `markNativeSession(uid, target)` so the next
  launch is fast.
- Reuse `native-session.ts` as-is (it's not role-specific — it just caches
  `{uid, destination}` in localStorage). No changes needed there.
- Keep all existing `claimDoctorAccount` / `resolveDestination` calls and
  error handling exactly as they are today; only wrap them with the same
  cache-read/cache-write pattern the patient page already uses.

### `src/app/api/native-auth-token/route.ts`, `src/app/api/doc/native-auth-token/route.ts`

No behavior change. These already are the two separate role-specific native
login endpoints requested. (Documented here so it's explicit that "create
two native logins" is satisfied by existing code, not new files.)

## Flutter app changes (`SOOCHER-APP-FLUTTER/soocher-doctor-app-main`)

### `lib/screens/login_screen.dart`

- Add a secondary "Doctor Login" button/link alongside the existing default
  login action. Selecting it sets an explicit `isDoctorLogin` flag that is
  passed forward instead of being inferred later.
- Default (no selection) continues to behave as patient login.

### `lib/screens/web_view_screen.dart`

- Accept the explicit role flag from `login_screen.dart` (via constructor
  param / navigation argument) instead of resolving `_doctorPrefix` from
  Firestore `Users.type` post-auth (`_resolveUserType`/`_applyBaseUrl`).
- Use the flag to pick which token endpoint to call
  (`/api/native-auth-token` vs `/api/doc/native-auth-token`) and which
  native-auth page to load (`/native-auth` vs `/doc/native-auth`).
- Firestore-based type resolution stays as a fallback only for the
  already-signed-in relaunch path in `splash_screen.dart` (unchanged) —
  fresh logins now use the explicit choice instead of a guess.

## Safety

- `claimDoctorAccount` guard logic is untouched: it still refuses to convert
  an existing non-doctor account. An explicit "Doctor Login" button on a
  patient's account is no more dangerous than today's `?as=doctor` web flow,
  which has the identical guard.
- Caching in `doc/native-auth/page.tsx` mirrors the patient page's proven
  logic exactly — same timeout constants, same self-heal behavior — rather
  than inventing new caching logic.

## Testing

Manual, on both repos:
1. Fresh patient login (default button) → lands on `/`.
2. Fresh doctor login ("Doctor Login" button) → lands on
   `/doc/dashboard` or `/doc/onboarding`.
3. Returning patient relaunch → instant redirect (existing behavior,
   regression check).
4. Returning doctor relaunch → instant redirect (new behavior, the actual
   fix).
5. Existing patient account attempts "Doctor Login" → rejected, signed out,
   sent to `/login?denied=1` (same as today's `?as=doctor` guard).
