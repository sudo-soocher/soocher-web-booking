# Native Login Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Flutter app an explicit "Login" (patient, default) vs "Doctor Login" choice on its login screen, and make doctor native-login as fast as patient native-login by porting the existing session-cache fast path to the doctor handoff page.

**Architecture:** Two independent, additive changes — no new API endpoints, no changes to `send-otp`/`verify-otp`, no changes to `claimDoctorAccount`'s account-safety guard. (1) Web: `src/app/doc/native-auth/page.tsx` gains the same `native-session.ts` localStorage caching that `src/app/native-auth/page.tsx` already has, so a returning doctor redirects instantly instead of re-resolving Firestore every launch. (2) Flutter: `login_screen.dart` gets an explicit role toggle threaded through `WebViewScreen`'s new `loginRole` param, replacing the silent post-auth Firestore guess for fresh logins only — the splash-screen relaunch path is untouched and still resolves role from the cached profile as before.

**Tech Stack:** Next.js 15 (App Router, TypeScript, client components), Firebase Auth/Firestore (client SDK), Flutter (Dart, StatefulWidget, firebase_auth, webview_flutter). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-23-native-login-split-design.md`

## Global Constraints

- Do not modify `src/app/api/auth/send-otp/route.ts` or `src/app/api/auth/verify-otp/route.ts` (unified WhatsApp OTP web login stays exactly as-is).
- Do not modify `claimDoctorAccount()` or `resolveDestination()` in `src/lib/post-login-route.ts` — their guard logic (never overwrite an existing non-doctor account) is the exact protection that a prior doctor/patient login split broke; only call these functions the same way the codebase already does.
- Do not modify `src/app/api/native-auth-token/route.ts` or `src/app/api/doc/native-auth-token/route.ts` — they already are the two role-specific native login endpoints; no new endpoints are created.
- `splash_screen.dart`'s relaunch path (`WebViewScreen(userDetails: details)` with no explicit role) must keep resolving role via `_resolveUserType()`/Firestore exactly as it does today.

---

## File Structure

- Modify: `SOOCHER-USER-WEB/soocher-web-booking/src/app/doc/native-auth/page.tsx` — add session-cache fast path (mirrors `src/app/native-auth/page.tsx`).
- Modify: `SOOCHER-APP-FLUTTER/soocher-doctor-app-main/lib/screens/web_view_screen.dart` — accept an explicit `loginRole` constructor param that skips Firestore role-guessing when present.
- Modify: `SOOCHER-APP-FLUTTER/soocher-doctor-app-main/lib/screens/login_screen.dart` — add a "Doctor Login" toggle and thread the chosen role into `WebViewScreen`.

---

### Task 1: Doctor native-auth fast path (web)

**Files:**
- Modify: `src/app/doc/native-auth/page.tsx` (full file, currently 90 lines)
- Reference (read-only, do not modify): `src/app/native-auth/page.tsx`, `src/lib/native-session.ts`, `src/lib/post-login-route.ts`, `src/lib/with-timeout.ts`

**Interfaces:**
- Consumes: `resolveDestination(uid)`, `claimDoctorAccount(uid, phoneNumber)`, `destinationPath(destination)` from `@/lib/post-login-route` (unchanged signatures); `markNativeSession(uid, destination?)`, `readNativeSession()`, `readNativeDestination()`, `clearNativeSession()` from `@/lib/native-session` (unchanged signatures); `withTimeout` from `@/lib/with-timeout`.
- Produces: nothing consumed by other tasks — this page is a leaf route.

- [x] **Step 1: Replace the file with the cached fast-path version**

Replace the full contents of `src/app/doc/native-auth/page.tsx` with:

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken, onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/doctor/lib/firebase";
import { PageLoader } from "@/doctor/components/ui/PageLoader";
import {
  claimDoctorAccount,
  destinationPath,
  resolveDestination,
} from "@/lib/post-login-route";
import { withTimeout } from "@/lib/with-timeout";
import {
  markNativeSession,
  readNativeSession,
  readNativeDestination,
  clearNativeSession,
} from "@/lib/native-session";

// Firestore's SDK does not time out a stalled connection on its own — see
// with-timeout.ts for what happens without this.
const AUTH_TIMEOUT_MS = 8000;

/**
 * Read the `uid` claim out of a Firebase custom token without verifying it.
 * Only used to answer "does the already-persisted session belong to the same
 * user this token is for?" — see native-auth/page.tsx for the full rationale.
 */
function uidFromCustomToken(ct: string): string | null {
  try {
    const payload = ct.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const uid = JSON.parse(atob(padded))?.uid;
    return typeof uid === "string" ? uid : null;
  } catch {
    return null;
  }
}

/** Resolve the session Firebase restores from IndexedDB — a local read. */
function waitForPersistedUser(timeoutMs = 1500): Promise<User | null> {
  return new Promise((resolve) => {
    let settled = false;
    let unsub: (() => void) | null = null;

    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      queueMicrotask(() => unsub?.());
      resolve(user);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    unsub = onAuthStateChanged(auth, finish, () => finish(null));
  });
}

export default function NativeAuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const ct = params.get("ct");

    /**
     * Resolve where a signed-in doctor account belongs and go there,
     * claiming a brand-new account as a doctor when it isn't one yet.
     * Identical decision order to the pre-fast-path version of this page —
     * only the caching around it is new.
     */
    const resolveAndGo = async (uid: string, phoneNumber: string | null) => {
      const destination = await withTimeout(
        resolveDestination(uid),
        AUTH_TIMEOUT_MS,
        "Couldn't reach the server. Check your connection and try again."
      );

      if (
        destination.kind === "doctor-dashboard" ||
        destination.kind === "doctor-onboarding"
      ) {
        const target = destinationPath(destination)!;
        markNativeSession(uid, target);
        if (cancelled) return;
        router.replace(target);
        return;
      }

      const claimed = await withTimeout(
        claimDoctorAccount(uid, phoneNumber),
        AUTH_TIMEOUT_MS,
        "Couldn't reach the server. Check your connection and try again."
      );
      if (claimed) {
        markNativeSession(uid, "/doc/onboarding");
        if (cancelled) return;
        router.replace("/doc/onboarding");
        return;
      }

      clearNativeSession();
      await signOut(auth);
      if (cancelled) return;
      router.replace("/login?denied=1");
    };

    // ── Fast path: already authenticated as a doctor on a previous launch ──
    const knownUid = readNativeSession();
    const ctUid = ct ? uidFromCustomToken(ct) : null;

    if (knownUid && (!ctUid || ctUid === knownUid)) {
      const cachedTarget = readNativeDestination() ?? "/doc/dashboard";
      router.replace(cachedTarget);

      // Detached from React so it survives this unmount.
      waitForPersistedUser(5000).then((user) => {
        if (user) {
          void resolveAndGo(user.uid, user.phoneNumber).catch(() => {});
          return;
        }
        if (!ct) {
          clearNativeSession();
          return;
        }
        withTimeout(signInWithCustomToken(auth, ct), AUTH_TIMEOUT_MS)
          .then((result) =>
            resolveAndGo(result.user.uid, result.user.phoneNumber)
          )
          .catch(() => clearNativeSession());
      });
      return;
    }

    // ── Slow path: genuine first sign-in on this device ─────────────────
    (async () => {
      const existing = await waitForPersistedUser();
      if (cancelled) return;

      if (existing && (!ctUid || ctUid === existing.uid)) {
        try {
          await resolveAndGo(existing.uid, existing.phoneNumber);
        } catch (err) {
          if (cancelled) return;
          setError((err as { message?: string })?.message || "Authentication failed.");
        }
        return;
      }

      if (!ct) {
        setError("No authentication token provided.");
        return;
      }

      try {
        const result = await withTimeout(
          signInWithCustomToken(auth, ct),
          AUTH_TIMEOUT_MS,
          "Sign-in timed out. Check your connection and try again."
        );
        if (cancelled) return;
        await resolveAndGo(result.user.uid, result.user.phoneNumber);
      } catch (err) {
        if (cancelled) return;
        clearNativeSession();
        setError((err as { message?: string })?.message || "Authentication failed.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
        <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50">
            <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900">Sign-in failed</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
          <a href="/login?as=doctor" className="mt-2 block w-full rounded-full bg-primary py-3 text-center text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-600">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return <PageLoader label="Signing in" />;
}
```

- [x] **Step 2: Type-check the web app**

Run: `cd /Users/apple/Documents/PP/SOOCHER-USER-WEB/soocher-web-booking && npx tsc --noEmit`
Expected: no new errors referencing `src/app/doc/native-auth/page.tsx`.

- [x] **Step 3: Manual verification with the dev server**

Run: `npm run dev` in `SOOCHER-USER-WEB/soocher-web-booking`.
1. In a browser, sign in as a doctor via `/login?as=doctor` (or an existing doctor test account) so a session exists.
2. Visit `/doc/native-auth?ct=<any-string>` directly — with a real Firebase session already present, confirm it redirects immediately (fast path) without waiting on a visible loading spinner, and check the browser console for no new errors.
3. Clear `localStorage` (`soocher_session_uid`, `soocher_session_dest`) and reload — confirm the slow path still resolves and redirects correctly (dashboard vs onboarding), i.e. behaves exactly as it did before this change.

- [x] **Step 4: Commit**

```bash
cd /Users/apple/Documents/PP/SOOCHER-USER-WEB/soocher-web-booking
git add src/app/doc/native-auth/page.tsx
git commit -m "Add session-cache fast path to doctor native-auth handoff"
```

---

### Task 2: Explicit user/doctor login choice (Flutter)

**Files:**
- Modify: `lib/screens/web_view_screen.dart:19-26,205-212` (constructor + `_init`)
- Modify: `lib/screens/login_screen.dart:697-707` (`_goToApp`), `:545-550` and `:620-622` (`_goToApp` call sites), `:285-303` (state fields), `:873-898` (`_PhoneStep` usage in `build()`), `:927-946` (`_PhoneStep` widget)

**Interfaces:**
- Consumes: nothing from Task 1 (independent repo).
- Produces: `WebViewScreen({Key? key, Map<String, dynamic>? userDetails, String? loginRole})` — `loginRole` is `'DOCTOR'`, `'PATIENT'`, or `null` (null = resolve via Firestore as before, used only by `splash_screen.dart`'s relaunch path, which is not modified in this task).

- [x] **Step 1: Add `loginRole` to `WebViewScreen` and use it in `_init()`**

In `lib/screens/web_view_screen.dart`, replace lines 19-26:

```dart
class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key, this.userDetails, this.loginRole});

  final Map<String, dynamic>? userDetails;

  /// Explicit role chosen on the login screen: `'DOCTOR'` or `'PATIENT'`.
  /// Null on the splash-screen relaunch path, which still resolves role from
  /// the cached Firestore profile via [_resolveUserType].
  final String? loginRole;

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}
```

Then replace the `_init()` method (lines 205-212):

```dart
  /// Resolve the user's `type`, pick the matching site, then start the
  /// custom-token auth load against it. A `loginRole` passed from the login
  /// screen is trusted outright — the user chose it explicitly, so there is
  /// nothing to guess. Only the relaunch path (no `loginRole`) still asks
  /// Firestore.
  Future<void> _init() async {
    final idTokenFuture = FirebaseAuth.instance.currentUser?.getIdToken();
    final type = widget.loginRole ?? await _resolveUserType();
    _applyBaseUrl(type);
    _loadWithCustomToken(idTokenFuture: idTokenFuture);
  }
```

- [x] **Step 2: Add a role toggle to `LoginScreen`'s state**

In `lib/screens/login_screen.dart`, add a field next to the existing state fields (near line 294-296, after `bool _loading = false;` / `String? _error;`):

```dart
  /// Explicit role for the account about to be signed in. Defaults to the
  /// patient flow; the "Doctor Login" toggle on the phone step flips this.
  String _loginRole = 'PATIENT';

  void _toggleLoginRole() {
    setState(() {
      _loginRole = _loginRole == 'DOCTOR' ? 'PATIENT' : 'DOCTOR';
    });
  }
```

- [x] **Step 3: Thread `_loginRole` through `_goToApp` and its call sites**

Replace `_goToApp` (lines 697-707):

```dart
  void _goToApp([Map<String, dynamic>? userDetails]) {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) =>
            WebViewScreen(userDetails: userDetails, loginRole: _loginRole),
        transitionDuration: const Duration(milliseconds: 400),
        transitionsBuilder: (_, anim, __, child) =>
            FadeTransition(opacity: anim, child: child),
      ),
    );
  }
```

(No changes needed at the two `_goToApp(details)` call sites around line 550 and line 622 — `_goToApp` now reads `_loginRole` from state directly, so the call sites are unchanged.)

- [x] **Step 4: Add the "Doctor Login" toggle button to `_PhoneStep`**

In `lib/screens/login_screen.dart`, update the `_PhoneStep` widget (around line 927) to accept and display the toggle. Replace the class declaration and constructor:

```dart
class _PhoneStep extends StatelessWidget {
  const _PhoneStep({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.loading,
    required this.error,
    required this.country,
    required this.onCountryTap,
    required this.onSend,
    required this.loginRole,
    required this.onToggleRole,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool loading;
  final String? error;
  final _Country country;
  final VoidCallback onCountryTap;
  final VoidCallback onSend;
  final String loginRole;
  final VoidCallback onToggleRole;
```

Then, in `_PhoneStep.build()`, insert a toggle button right after the `_PrimaryButton` (after the closing of the `_PrimaryButton(...)` call, before the widget's closing `],\n    );`):

```dart
        const SizedBox(height: 14),
        Center(
          child: TextButton(
            onPressed: onToggleRole,
            child: Text(
              loginRole == 'DOCTOR'
                  ? 'Not a doctor? Patient login'
                  : 'Doctor Login',
              style: const TextStyle(
                color: _Palette.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
```

- [x] **Step 5: Pass `loginRole`/`onToggleRole` where `_PhoneStep` is constructed**

In `_LoginScreenState.build()` (around line 873-883), update the `_PhoneStep` instantiation:

```dart
                                ? _PhoneStep(
                                        key: const ValueKey('phone'),
                                        controller: _phoneCtrl,
                                        focusNode: _phoneFocus,
                                        loading: _loading,
                                        error: _error,
                                        country: _selectedCountry,
                                        onCountryTap: _showCountryPicker,
                                        onSend: _sendOtp,
                                        loginRole: _loginRole,
                                        onToggleRole: _toggleLoginRole,
                                      )
```

- [x] **Step 6: Static analysis**

Run: `cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main && flutter analyze`
Expected: no new errors/warnings introduced in `login_screen.dart` or `web_view_screen.dart`.

- [x] **Step 7: Manual verification**

Run: `flutter run` (against a debug/test build, using the QA test OTP number `+919988998899` documented in `SOOCHER-USER-WEB/soocher-web-booking/src/lib/test-otp-numbers.ts` if `ALLOW_TEST_OTP=true` is set on the web deployment being tested against).
1. Launch the app fresh (no cached session) → login screen shows the phone step with a "Doctor Login" link below the "Send OTP" button.
2. Leave the default (don't tap the link), complete OTP → confirm it calls `/api/native-auth-token` (patient endpoint — check `debugPrint`/logcat output for `[SoocherAuth] type=PATIENT`) and lands on the patient site.
3. Restart the app, this time tap "Doctor Login" before sending the OTP (link should now read "Not a doctor? Patient login"), complete OTP with a doctor test account → confirm it calls `/api/doc/native-auth-token` (`[SoocherAuth] type=DOCTOR` in logs) and lands under `/doc`.
4. Force-quit and relaunch the app while still signed in → confirm the splash-screen relaunch path still works unchanged (goes straight to `WebViewScreen`, resolves role from the cached profile, no login screen shown).

- [x] **Step 8: Commit**

```bash
cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main
git add lib/screens/web_view_screen.dart lib/screens/login_screen.dart
git commit -m "Add explicit doctor/patient login choice to login screen"
```

---

## Self-Review Notes

- **Spec coverage:** §2 (doctor fast path) → Task 1. §3 (Flutter explicit role choice) → Task 2. §1 (two native endpoints already exist) and §4 (safety — `claimDoctorAccount` untouched) are constraints, not code changes, and are captured in Global Constraints. §5 (testing) → Step 3/Step 7 manual verification in each task.
- **Placeholder scan:** none — every step has literal code or literal shell commands.
- **Type consistency:** `WebViewScreen.loginRole` (`String?`) is defined once in Task 2 Step 1 and consumed the same way in `_init()` in the same step; `_LoginScreenState._loginRole` (`String`, default `'PATIENT'`) is defined in Step 2 and consumed identically in Steps 3-5. `resolveAndGo(uid, phoneNumber)` in Task 1 is defined once and called with matching argument order (`uid: string, phoneNumber: string | null`) at every call site within the same file.
