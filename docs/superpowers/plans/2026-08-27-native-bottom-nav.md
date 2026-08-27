# Native Bottom Nav (Flutter App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web-rendered bottom nav inside the Flutter app's WebView with a native `BottomNavigationBar`, backed by one persistent `WebViewController` per tab (`IndexedStack`), for both the patient and doctor sides.

**Architecture:** All shared WebView behavior (video/chat handoff, login-denial interception, JS injections, bridge messages) is extracted from the current single-WebView `WebViewScreen` into a reusable mixin, `SoocherWebViewBridge`, applied by a new `SoocherTabWebView` widget — one instance per tab. `WebViewScreen` becomes a shell: it performs the existing one-time custom-token auth handoff exactly as today (on what becomes Tab 0's own controller — no separate hidden WebView), then once that lands on a real page, builds the native `BottomNavigationBar` + `IndexedStack` of the remaining tabs. Cross-tab in-page navigation (a link inside one tab pointing at another tab's root route) is detected in the shared mixin and handled by loading the URL on the target tab's own controller and switching to it, so nav highlight and content never disagree.

**Tech Stack:** Flutter/Dart (`webview_flutter` 4.14.0, `stream_chat_flutter` 9.27.0), Next.js/TypeScript (client components only, no new API routes).

**Spec:** `docs/superpowers/specs/2026-08-27-native-bottom-nav-design.md`

## Global Constraints

- `WebViewScreen`'s public constructor — `WebViewScreen({Key? key, Map<String, dynamic>? userDetails, String? loginRole})` — must not change. `login_screen.dart` and `splash_screen.dart` call it today and must keep working unmodified.
- The existing custom-token auth handoff (`_init`, `_resolveUserType`, `_applyBaseUrl`, `_loadWithCustomToken`, `_doSignOut`, `_handleLoginDetected`'s re-auth-vs-signout branch, the 409 "multiple accounts" handling) must not change behavior — it runs once, before any tab UI exists, exactly as it does today.
- No new web API routes. No changes to `send-otp`/`verify-otp`/`native-auth-token`/`doc/native-auth-token`.
- Tabs, in order, per role (exact paths, from `MobileBottomNav.tsx` / `BottomNav.tsx`):
  - Patient: Home (`/`), Find (`/doctors`), Bookings (`/bookings`), Profile (`/profile`)
  - Doctor: Home (`/doc/dashboard`), Consultations (`/doc/consultations`), Messages (`/doc/messages`), Profile (`/doc/profile`)
- The doctor Messages tab badge is sourced from a native `stream_chat_flutter` client's `totalUnreadCount`, independent of any tab's WebView.

---

## File Structure

- Create: `lib/services/soocher_webview_bridge.dart` — `SoocherTabCallbacks` class, `soocherUserAgent` constant, `SoocherWebViewBridge` mixin (all the shared WebView behavior, generalized to work per-tab).
- Create: `lib/screens/soocher_tab_webview.dart` — `SoocherTabWebView` widget, one per tab, applies the mixin.
- Modify: `lib/screens/web_view_screen.dart` — becomes the shell (auth bootstrap + native bottom nav + `IndexedStack` of `SoocherTabWebView`).
- Modify: `src/components/layout/MobileBottomNav.tsx` — hide when running inside the Flutter app.
- Modify: `src/doctor/components/layout/BottomNav.tsx` — same.

---

### Task 1: Hide the web-rendered bottom navs inside the Flutter app

**Files:**
- Modify: `src/components/layout/MobileBottomNav.tsx` (full file, 99 lines)
- Modify: `src/doctor/components/layout/BottomNav.tsx` (full file, 104 lines)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by other tasks — independent of the Flutter work, ships on its own.

- [ ] **Step 1: Add the in-app check to `MobileBottomNav.tsx`**

In `src/components/layout/MobileBottomNav.tsx`, replace the `isHidden` computation and the guard that follows it:

```tsx
  // Match whole path segments, not raw prefixes. A plain `startsWith("/doc")`
  // would also swallow the patient routes `/doctors` and `/doctor/[id]` and
  // strip the tabs off pages that need them.
  const isHidden = HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  // The Flutter app now renders its own native bottom nav (see
  // soocher_webview_bridge.dart's soocherUserAgent) — this one must not
  // double up underneath it. Browser/PWA users never send this UA, so this
  // is a no-op for them.
  const isInApp =
    typeof navigator !== "undefined" && navigator.userAgent.includes("SoocherApp");
  if (isHidden || isInApp || !mounted) return null;
```

- [ ] **Step 2: Add the same check to `BottomNav.tsx`**

In `src/doctor/components/layout/BottomNav.tsx`, replace:

```tsx
  // Hide on edit pages — their own sticky Save CTA owns the bottom of the screen.
  if (pathname.startsWith("/doc/profile/edit/")) return null;
  if (!mounted) return null;
```

with:

```tsx
  // Hide on edit pages — their own sticky Save CTA owns the bottom of the screen.
  if (pathname.startsWith("/doc/profile/edit/")) return null;
  // The Flutter app now renders its own native bottom nav (see
  // soocher_webview_bridge.dart's soocherUserAgent) — this one must not
  // double up underneath it. Browser/PWA users never send this UA, so this
  // is a no-op for them.
  const isInApp =
    typeof navigator !== "undefined" && navigator.userAgent.includes("SoocherApp");
  if (isInApp || !mounted) return null;
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/apple/Documents/PP/SOOCHER-USER-WEB/soocher-web-booking && npx tsc --noEmit`
Expected: no new errors referencing either file.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Open `/` and `/doc/dashboard` in a regular desktop/mobile browser — confirm both bottom navs still render normally (this change is a no-op there; the app's real user agent never contains `SoocherApp`).

- [ ] **Step 5: Commit**

```bash
cd /Users/apple/Documents/PP/SOOCHER-USER-WEB/soocher-web-booking
git add src/components/layout/MobileBottomNav.tsx src/doctor/components/layout/BottomNav.tsx
git commit -m "Hide web bottom nav when running inside the Flutter app"
```

---

### Task 2: Shared WebView bridge mixin

**Files:**
- Create: `lib/services/soocher_webview_bridge.dart`
- Reference (read-only, do not modify): `lib/screens/web_view_screen.dart` (source of the logic being extracted), `lib/screens/chat_screen.dart`, `lib/screens/chat_list_screen.dart`, `lib/screens/video_call_screen.dart` (constructors this mixin's handoff methods call), `lib/screens/login_screen.dart` (not called directly here, but `LoginScreen`'s constructor shape informs `SoocherTabCallbacks.onRoleDenied`'s signature)

**Interfaces:**
- Consumes: `VideoCallScreen({required uid, required idToken, required consultationId, required isDoctor})`, `ChatScreen({required uid, required idToken, required consultationId, required isDoctor, required webBaseUrl, displayName})`, `ChatListScreen({required uid, required idToken, required isDoctor, required webBaseUrl, displayName})` — all unchanged from today.
- Produces: `const String soocherUserAgent` (full UA string, ending in ` SoocherApp/1.0`); `class SoocherTabCallbacks` with fields `void Function() onLoginDetected`, `void Function(String role, String message) onRoleDenied`, `void Function(String url, int tabIndex) onCrossTabNavigate`; `mixin SoocherWebViewBridge<T extends StatefulWidget> on State<T>` requiring the applying class to implement `WebViewController get wvc`, `bool get isDoctor`, `String get baseUrl`, `List<String> get tabRootPaths`, `int get tabIndex`, `SoocherTabCallbacks get callbacks`, and exposing `NavigationDelegate buildNavigationDelegate()`, `void wireBridgeAndInjections(WebViewController controller)` (sets the JS channel + `onShowFileSelector` on Android), `bool hasError` (getter, mixin-managed), `void retryLoad(String initialUrl)`.

- [ ] **Step 1: Create the file with the callbacks class, user agent constant, and mixin skeleton**

Create `lib/services/soocher_webview_bridge.dart`:

```dart
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../screens/chat_list_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/video_call_screen.dart';

/// Same UA `WebViewScreen`'s bootstrap controller used before this refactor,
/// with a distinguishing token appended so the web app can tell an in-app
/// WebView apart from a real mobile browser — see `MobileBottomNav.tsx` /
/// `BottomNav.tsx`, which now hide the web-rendered bottom nav when this
/// token is present, since the app now renders its own native one.
const soocherUserAgent =
    'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 SoocherApp/1.0';

/// Callbacks a [SoocherWebViewBridge] user cannot fulfil on its own — each
/// needs state or context that only the owning shell (`WebViewScreen`) has:
/// a single Firebase sign-out + reset-to-[LoginScreen] must happen exactly
/// once even if multiple tabs detect it around the same time, and switching
/// tabs needs the shell's list of sibling controllers.
class SoocherTabCallbacks {
  const SoocherTabCallbacks({
    required this.onLoginDetected,
    required this.onRoleDenied,
    required this.onCrossTabNavigate,
  });

  /// The web app bounced to a genuine (non-role-denial) `/login` — sign out
  /// and reset to the native [LoginScreen].
  final void Function() onLoginDetected;

  /// The web app rejected a role mismatch — sign out and reset to a native
  /// [LoginScreen] preset to `role`, showing `message`.
  final void Function(String role, String message) onRoleDenied;

  /// `url` resolved to a tab root other than this one (see
  /// [SoocherWebViewBridge.tabIndexForPath]) — the shell should load `url`
  /// on tab `tabIndex`'s own controller and make it the active tab.
  final void Function(String url, int tabIndex) onCrossTabNavigate;
}

/// Everything one tab's [WebViewController] needs — navigation interception
/// (video call, chat, login handoff, cross-tab routes, external links),
/// the `SoocherBridge` JS channel, and all the page-behavior injections
/// (focus-scroll, pull-to-refresh, date/file pickers, etc.) — factored out
/// of the single-WebView `WebViewScreen` so each tab's [SoocherTabWebView]
/// gets identical behavior without duplicating it four times.
mixin SoocherWebViewBridge<T extends StatefulWidget> on State<T> {
  WebViewController get wvc;
  bool get isDoctor;
  String get baseUrl;

  /// This role's full ordered tab-root path list, e.g.
  /// `['/', '/doctors', '/bookings', '/profile']` — used to detect
  /// cross-tab navigation (see [tabIndexForPath]).
  List<String> get tabRootPaths;

  /// This tab's own index into [tabRootPaths].
  int get tabIndex;

  SoocherTabCallbacks get callbacks;

  bool _joiningCall = false;
  bool _openingChat = false;
  bool _refreshing = false;
  bool _handlingRoleDenied = false;
  String? _retriedHttpErrorUrl;
  String? _currentMainFrameUrl;
  Timer? _refreshSafetyTimer;
  bool _hasError = false;

  /// True while this tab's controller is showing the native error/retry
  /// view instead of the WebView. The owning [SoocherTabWebView] reads this
  /// after each `setState` this mixin triggers.
  bool get hasError => _hasError;

  @override
  void dispose() {
    _refreshSafetyTimer?.cancel();
    super.dispose();
  }
}
```

- [ ] **Step 2: Commit the skeleton**

```bash
cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main
git add lib/services/soocher_webview_bridge.dart
git commit -m "Add SoocherWebViewBridge mixin skeleton"
```

---

### Task 3: Port navigation interception + cross-tab detection into the mixin

**Files:**
- Modify: `lib/services/soocher_webview_bridge.dart` (adds to the mixin body from Task 2)

**Interfaces:**
- Consumes: everything from Task 2 (the mixin skeleton, `SoocherTabCallbacks`).
- Produces: `NavigationDelegate buildNavigationDelegate()` on the mixin, plus its private helpers — consumed by Task 4's `SoocherTabWebView`.

- [ ] **Step 1: Add the URL-classification helpers**

Inside the `SoocherWebViewBridge` mixin body (after the field declarations from Task 2), add:

```dart
  // ── URL classification ──────────────────────────────────────────────────

  /// True for a genuine logout/auth-failure landing on /login — NOT for
  /// `/login?complete=1` (profile-completion) or `/login?denied=...`
  /// (role-mismatch rejection) — see [deniedLoginInfo].
  bool isLoginUrl(String url) {
    final uri = Uri.tryParse(url);
    if ((uri?.path ?? '') != '/login') return false;
    final params = uri?.queryParameters;
    if (params?['complete'] == '1') return false;
    if (params?.containsKey('denied') ?? false) return false;
    return true;
  }

  /// Maps a `/login?denied=...` URL to the native role + message to show,
  /// or null if this isn't a role-mismatch rejection.
  ({String role, String message})? deniedLoginInfo(String url) {
    final uri = Uri.tryParse(url);
    if ((uri?.path ?? '') != '/login') return null;
    final denied = uri?.queryParameters['denied'];
    if (denied == null) return null;
    if (denied == 'already-doctor') {
      return (
        role: 'PATIENT',
        message: "This number is registered as a doctor — use Doctor Login.",
      );
    }
    return (
      role: 'DOCTOR',
      message: "This number is registered as a patient — use Patient Login.",
    );
  }

  String? extractChatConsultationId(String url) {
    final uri = Uri.tryParse(url);
    final path = uri?.path ?? '';
    final patterns = [
      RegExp(r'/consultations/([^/?#]+)/(?:chat|messages)$'),
      RegExp(r'/messages/([^/?#]+)$'),
      RegExp(r'/chat/([^/?#]+)$'),
    ];
    for (final pattern in patterns) {
      final match = pattern.firstMatch(path);
      if (match != null) return match.group(1);
    }
    final queryId =
        uri?.queryParameters['consultationId'] ??
        uri?.queryParameters['consultation'];
    return queryId?.isNotEmpty == true ? queryId : null;
  }

  bool isMessagesUrl(String url) {
    return (Uri.tryParse(url)?.path ?? '') == '/messages';
  }

  /// Returns the tab index `path` belongs to, or null if it isn't any tab's
  /// root. Exact match for `/` (home); prefix match for the others, so
  /// `/bookings/abc123` still resolves to the Bookings tab.
  int? tabIndexForPath(String path) {
    for (var i = 0; i < tabRootPaths.length; i++) {
      final root = tabRootPaths[i];
      if (root == '/') {
        if (path == '/') return i;
        continue;
      }
      if (path == root || path.startsWith('$root/')) return i;
    }
    return null;
  }
```

- [ ] **Step 2: Add the `NavigationDelegate` builder**

Immediately after the helpers from Step 1, add:

```dart
  // ── Navigation delegate ─────────────────────────────────────────────────

  NavigationDelegate buildNavigationDelegate() {
    return NavigationDelegate(
      onNavigationRequest: (req) async {
        final url = req.url;
        debugPrint('[NavRequest][tab$tabIndex] url=$url isMain=${req.isMainFrame}');

        // Video call room. Doctor and patient reach this through two
        // different web routes — `/consultations/{id}/room` (doctor) and
        // `/video-call/{id}` (patient).
        final roomMatch =
            RegExp(r'/consultations/([^/?#]+)/room').firstMatch(url) ??
            RegExp(r'/video-call/([^/?#]+)').firstMatch(url);
        if (roomMatch != null) {
          _requestVideoCallData(roomMatch.group(1)!);
          return NavigationDecision.prevent;
        }

        final chatId = extractChatConsultationId(url);
        if (chatId != null) {
          _requestChatData(chatId);
          return NavigationDecision.prevent;
        }

        if (!isDoctor && isMessagesUrl(url)) {
          _requestChatList();
          return NavigationDecision.prevent;
        }

        // A route that belongs to a *different* tab — hand it to that
        // tab's own controller instead of navigating here.
        final path = Uri.tryParse(url)?.path ?? '';
        final targetTab = tabIndexForPath(path);
        if (targetTab != null && targetTab != tabIndex) {
          callbacks.onCrossTabNavigate(url, targetTab);
          return NavigationDecision.prevent;
        }

        if (isLoginUrl(url)) {
          debugPrint('[NavRequest][tab$tabIndex] → login detected');
          callbacks.onLoginDetected();
          return NavigationDecision.prevent;
        }

        final denied = deniedLoginInfo(url);
        if (denied != null) {
          debugPrint('[NavRequest][tab$tabIndex] → role-denied redirect');
          _handleRoleDenied(denied);
          return NavigationDecision.prevent;
        }

        if (url.startsWith('https://') || url.startsWith('http://')) {
          final host = Uri.tryParse(url)?.host ?? '';
          final isOwnDomain =
              host == 'soocher.in' || host.endsWith('.soocher.in');
          if (!isOwnDomain && req.isMainFrame) {
            unawaited(
              launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
            );
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        }
        if (url.startsWith('about:')) {
          return NavigationDecision.navigate;
        }

        final launched = await _tryLaunchExternal(url);
        if (!launched) _showSnack("Couldn't open the app for this link.");
        return NavigationDecision.prevent;
      },
      onPageStarted: (url) {
        _currentMainFrameUrl = url;
        setState(() => _hasError = false);
      },
      onPageFinished: (url) {
        debugPrint('[PageFinished][tab$tabIndex] url=$url');
        if (_refreshing) {
          _refreshSafetyTimer?.cancel();
          setState(() => _refreshing = false);
        }
        if (isLoginUrl(url)) {
          callbacks.onLoginDetected();
          return;
        }
        final denied = deniedLoginInfo(url);
        if (denied != null) {
          _handleRoleDenied(denied);
          return;
        }
        _injectRouteHook();
        _injectOverscrollFix();
        _injectFocusScrollFix();
        _injectPullToRefreshHook();
        _injectDatePickerHook();
        _injectFilePickerHook();
        _injectHeaderPaddingFix();
        _injectErrorCapture();
      },
      onUrlChange: (UrlChange change) {
        final url = change.url ?? '';
        debugPrint('[UrlChange][tab$tabIndex] url=$url');
        final path = Uri.tryParse(url)?.path ?? '';
        final targetTab = tabIndexForPath(path);
        if (isLoginUrl(url)) {
          callbacks.onLoginDetected();
        } else if (deniedLoginInfo(url) != null) {
          _handleRoleDenied(deniedLoginInfo(url)!);
        } else if (targetTab != null && targetTab != tabIndex) {
          callbacks.onCrossTabNavigate(url, targetTab);
        }
        if (path.startsWith('/onboarding') || path.startsWith('/doc/onboarding')) {
          Future.delayed(const Duration(milliseconds: 600), _injectHeaderPaddingFix);
        }
      },
      onWebResourceError: (error) {
        debugPrint(
          '[SoocherWebView][tab$tabIndex] resource error: isForMainFrame=${error.isForMainFrame} code=${error.errorCode} desc=${error.description} url=${error.url}',
        );
        if (error.isForMainFrame != false) {
          setState(() => _hasError = true);
        }
      },
      onHttpError: (error) {
        final url = error.request?.uri.toString();
        final statusCode = error.response?.statusCode;
        if (url == null || url != _currentMainFrameUrl) return;
        if (statusCode == null || statusCode < 500) return;
        if (_retriedHttpErrorUrl == url) {
          setState(() => _hasError = true);
          return;
        }
        _retriedHttpErrorUrl = url;
        Future.delayed(const Duration(milliseconds: 800), () {
          if (!mounted) return;
          wvc.loadRequest(Uri.parse(url));
        });
      },
    );
  }

  void _handleRoleDenied(({String role, String message}) info) {
    if (_handlingRoleDenied) return;
    _handlingRoleDenied = true;
    callbacks.onRoleDenied(info.role, info.message);
  }

  /// Re-load this tab's own root URL and clear its error state — the retry
  /// button on [hasError]'s error view calls this.
  void retryLoad(String initialUrl) {
    setState(() => _hasError = false);
    wvc.loadRequest(Uri.parse(initialUrl));
  }
```

- [ ] **Step 2: Static analysis (expect unresolved-reference errors — later steps add them)**

Run: `cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main && flutter analyze lib/services/soocher_webview_bridge.dart`
Expected: errors for `_requestVideoCallData`, `_requestChatData`, `_requestChatList`, `_tryLaunchExternal`, `_showSnack`, `_injectRouteHook`, `_injectOverscrollFix`, `_injectFocusScrollFix`, `_injectPullToRefreshHook`, `_injectDatePickerHook`, `_injectFilePickerHook`, `_injectHeaderPaddingFix`, `_injectErrorCapture` undefined — Task 4 adds every one of these. Do not fix them here.

- [ ] **Step 3: Commit**

```bash
cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main
git add lib/services/soocher_webview_bridge.dart
git commit -m "Add navigation delegate and cross-tab detection to the bridge mixin"
```

---

### Task 4: Port JS injections, bridge handler, and native handoffs into the mixin

**Files:**
- Modify: `lib/services/soocher_webview_bridge.dart` (adds the remaining mixin methods; makes Task 3 compile)

**Interfaces:**
- Consumes: everything from Tasks 2-3.
- Produces: `void wireBridgeAndInjections(WebViewController controller)` — called once by `SoocherTabWebView.initState()` (Task 5) to attach the JS channel and Android file-selector hook to that tab's controller.

- [ ] **Step 1: Add the JS injection methods**

Add these methods to the mixin (content copied verbatim from the current `web_view_screen.dart`, only the doc comments trimmed for brevity since the full rationale already lives in that file's git history):

```dart
  // ── Overscroll fix ───────────────────────────────────────────────────────

  void _injectOverscrollFix() {
    wvc.runJavaScript(r'''
(function() {
  if (window.__soocherScrollFixed) return;
  window.__soocherScrollFixed = true;
  document.documentElement.style.overscrollBehavior = 'none';
  document.body.style.overscrollBehavior = 'none';
})();
''');
  }

  // ── Focus scroll-into-view fix ────────────────────────────────────────────

  void _injectFocusScrollFix() {
    wvc.runJavaScript(r'''
(function() {
  if (window.__soocherFocusScrollFixed) return;
  window.__soocherFocusScrollFixed = true;

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    return el.matches("input, textarea, select, [contenteditable='true']");
  }

  function nearestScrollable(el) {
    var node = el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      var style = getComputedStyle(node);
      var overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
        return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function revealField(el) {
    if (!isEditable(el)) return;
    var container = nearestScrollable(el);
    var viewport = window.visualViewport;
    var fieldRect = el.getBoundingClientRect();
    var visibleTop = viewport ? viewport.offsetTop : 0;
    var visibleBottom = viewport ? (viewport.offsetTop + viewport.height) : window.innerHeight;
    var margin = 16;

    if (fieldRect.top >= visibleTop + margin && fieldRect.bottom <= visibleBottom - margin) return;

    var targetTop = visibleTop + (visibleBottom - visibleTop) * 0.35;
    var delta = fieldRect.top - targetTop;
    var isDocument = container === document.scrollingElement || container === document.documentElement || container === document.body;
    if (isDocument) {
      window.scrollBy({ top: delta, behavior: 'smooth' });
    } else {
      container.scrollBy({ top: delta, behavior: 'smooth' });
    }
  }

  var settleTimer;
  function handleFocusIn(e) {
    var target = e.target;
    if (!isEditable(target)) return;
    clearTimeout(settleTimer);
    revealField(target);
    settleTimer = setTimeout(function() { revealField(target); }, 360);
  }

  function handleViewportChange() {
    var active = document.activeElement;
    if (!isEditable(active)) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function() { revealField(active); }, 80);
  }

  document.addEventListener('focusin', handleFocusIn, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
  }
})();
''');
  }

  // ── Pull-to-refresh ──────────────────────────────────────────────────────

  void _injectPullToRefreshHook() {
    wvc.runJavaScript(r'''
(function() {
  if (window.__soocherPullRefreshHooked) return;
  window.__soocherPullRefreshHooked = true;

  var startY = 0;
  var tracking = false;
  var triggered = false;
  var THRESHOLD = 140;

  function atTop() {
    return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 0;
  }

  document.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = atTop();
    triggered = false;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!tracking || triggered) return;
    if (!atTop()) { tracking = false; return; }
    var dy = e.touches[0].clientY - startY;
    if (dy > THRESHOLD) {
      triggered = true;
      tracking = false;
      SoocherBridge.postMessage(JSON.stringify({ type: 'pull_refresh' }));
    }
  }, { passive: true });

  document.addEventListener('touchend', function() {
    tracking = false;
  }, { passive: true });
})();
''');
  }

  bool _pullToRefreshAllowedFor(String? url) {
    final path = url != null ? (Uri.tryParse(url)?.path ?? '') : '';
    if (path.contains('/onboarding')) return false;
    if (path == '/login') return false;
    return true;
  }

  Future<void> _handlePullToRefresh() async {
    if (_refreshing) return;
    if (!_pullToRefreshAllowedFor(_currentMainFrameUrl)) return;
    setState(() => _refreshing = true);
    _refreshSafetyTimer?.cancel();
    _refreshSafetyTimer = Timer(const Duration(seconds: 6), () {
      if (mounted) setState(() => _refreshing = false);
    });
    try {
      await wvc.reload();
    } catch (e) {
      debugPrint('[PullToRefresh][tab$tabIndex] reload failed: $e');
      if (mounted) setState(() => _refreshing = false);
    }
  }

  // ── Diagnostic: surface uncaught JS errors via console ──────────────────

  void _injectErrorCapture() {
    wvc.runJavaScript(r'''
(function() {
  if (window.__soocherErrorCaptured) return;
  window.__soocherErrorCaptured = true;

  window.addEventListener('error', function(e) {
    console.error('[UncaughtError]', e.message, 'at', e.filename + ':' + e.lineno + ':' + e.colno, e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    var msg = reason && reason.message ? reason.message : String(reason);
    var stack = reason && reason.stack ? reason.stack : '';
    console.error('[UnhandledRejection]', msg, stack);
  });
})();
''');
  }

  // ── Date picker interception ─────────────────────────────────────────────

  void _injectDatePickerHook() {
    wvc.runJavaScript(r'''
(function() {
  if (window.__soocherDateHooked) return;
  window.__soocherDateHooked = true;

  function styleDateInput(input) {
    if (input.__soocherDateStyled) return;
    input.__soocherDateStyled = true;
    var realValue = input.value || '';
    input.setAttribute('data-sd-value', realValue);
    input.setAttribute('type', 'text');
    input.setAttribute('readonly', 'readonly');
    input.style.caretColor = 'transparent';
    if (realValue) input.value = realValue;
  }

  document.querySelectorAll('input[type="date"]').forEach(styleDateInput);
  new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if (node.matches('input[type="date"]')) styleDateInput(node);
        node.querySelectorAll('input[type="date"]').forEach(styleDateInput);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  function findDateInput(target) {
    if (!target || !target.closest) return null;
    var el = target.closest('input[type="date"], input[data-sd-value]');
    return el;
  }

  ['pointerdown', 'mousedown', 'touchstart', 'focus'].forEach(function(evtName) {
    document.addEventListener(evtName, function(e) {
      var input = findDateInput(e.target);
      if (!input) return;
      e.preventDefault();
      e.stopPropagation();
      styleDateInput(input);
      input.blur();
      if (!input.id) input.id = '__sd_' + Math.random().toString(36).substr(2, 8);
      SoocherBridge.postMessage(JSON.stringify({
        type: 'date_picker',
        fieldId: input.id,
        currentValue: input.getAttribute('data-sd-value') || input.value || ''
      }));
    }, true);
  });
})();
''');
  }

  void _setDateInputValue(String fieldId, String value) {
    final safeId = fieldId.replaceAll("'", r"\'");
    final safeVal = value.replaceAll("'", r"\'");
    wvc.runJavaScript('''
(function() {
  var input = document.getElementById('$safeId');
  if (!input) return;
  input.setAttribute('data-sd-value', '$safeVal');
  var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '$safeVal');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
})();
''');
  }

  // ── Native file picker (iOS only — Android uses setOnShowFileSelector) ──

  void _injectFilePickerHook() {
    if (!Platform.isIOS) return;
    wvc.runJavaScript(r'''
(function() {
  if (window.__soocherFileHooked) return;
  window.__soocherFileHooked = true;

  function interceptFileInput(input) {
    if (input.__soocherFile) return;
    input.__soocherFile = true;

    input.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!input.id) input.id = '__sf_' + Math.random().toString(36).substr(2, 8);
      SoocherBridge.postMessage(JSON.stringify({
        type: 'file_picker',
        fieldId: input.id,
        accept: input.getAttribute('accept') || ''
      }));
    }, true);
  }

  document.querySelectorAll('input[type="file"]').forEach(interceptFileInput);

  new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if (node.matches('input[type="file"]')) interceptFileInput(node);
        node.querySelectorAll('input[type="file"]').forEach(interceptFileInput);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
''');
  }

  void _setFilePickerResult(
    String fieldId,
    String base64Data,
    String fileName,
    String mimeType,
  ) {
    final safeId = fieldId.replaceAll("'", r"\'");
    final safeName = fileName.replaceAll("'", r"\'").replaceAll('\n', '');
    final safeMime = mimeType.replaceAll("'", r"\'");
    wvc.runJavaScript('''
(function() {
  var input = document.getElementById('$safeId');
  if (!input) return;
  try {
    var byteChars = atob('$base64Data');
    var byteNumbers = new Array(byteChars.length);
    for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    var byteArray = new Uint8Array(byteNumbers);
    var file = new File([byteArray], '$safeName', { type: '$safeMime' });
    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (e) {
    console.error('[FilePicker] failed to set file:', e);
  }
})();
''');
  }

  List<String> _extensionsFromAccept(String accept) {
    final exts = <String>{};
    for (final raw in accept.split(',')) {
      final part = raw.trim().toLowerCase();
      if (part.isEmpty || part == 'image/*' || part == '*/*') continue;
      if (part.startsWith('.')) {
        exts.add(part.substring(1));
      } else if (part.contains('/')) {
        final subtype = part.split('/').last;
        if (subtype == 'jpeg') {
          exts.addAll(['jpg', 'jpeg']);
        } else if (subtype != '*') {
          exts.add(subtype);
        }
      }
    }
    return exts.toList();
  }

  String _mimeTypeForFileName(String name) {
    final ext = name.contains('.') ? name.split('.').last.toLowerCase() : '';
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }

  Future<void> _handleNativeFilePicker(String fieldId, String accept) async {
    try {
      final wantsImageOnly = accept.contains('image/*');
      final extensions = _extensionsFromAccept(accept);
      final result = await FilePicker.platform.pickFiles(
        type: wantsImageOnly
            ? FileType.image
            : extensions.isEmpty
            ? FileType.any
            : FileType.custom,
        allowedExtensions: !wantsImageOnly && extensions.isNotEmpty ? extensions : null,
        withData: true,
      );
      if (result == null || result.files.isEmpty) return;
      final picked = result.files.first;
      final bytes = picked.bytes;
      if (bytes == null) return;
      _setFilePickerResult(
        fieldId,
        base64Encode(bytes),
        picked.name,
        _mimeTypeForFileName(picked.name),
      );
    } catch (e) {
      debugPrint('[FilePicker][tab$tabIndex] native pick failed: $e');
      _showSnack("Couldn't open the file picker. Please try again.");
    }
  }

  Future<List<String>> _onShowFileSelector(FileSelectorParams params) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: params.mode == FileSelectorMode.openMultiple,
        type: FileType.any,
        withData: false,
      );
      if (result == null) return const [];
      return result.files
          .where((f) => f.path != null)
          .map((f) => File(f.path!).uri.toString())
          .toList();
    } catch (e) {
      debugPrint('[FilePicker][tab$tabIndex] error: $e');
      return const [];
    }
  }

  // ── Onboarding header layout cleanup ─────────────────────────────────────

  void _injectHeaderPaddingFix() {
    wvc.runJavaScript(r'''
(function() {
  var __p = window.location.pathname;
  if (!__p.startsWith('/onboarding') && !__p.startsWith('/doc/onboarding')) return;
  var existing = document.getElementById('__sd_hfix');
  if (existing) existing.remove();
  document.querySelectorAll('[data-sd-content]').forEach(function(el) {
    el.removeAttribute('data-sd-content');
    el.style.removeProperty('padding-top');
  });
})();
''');
  }

  // ── Route hook (client-side navigation detection) ───────────────────────
  //
  // Client-side (History API) navigation never fires onNavigationRequest —
  // this mirrors that delegate's logic for pushState/replaceState/popstate,
  // including the cross-tab check, so a same-tab in-page link to another
  // tab's root is caught the same way a full navigation would be.

  void _injectRouteHook() {
    final tabRootPathsJs = tabRootPaths.map((p) => "'${p.replaceAll("'", "\\'")}'").join(',');
    wvc.runJavaScript('''
(function() {
  if (window.__soocherHooked) return;
  window.__soocherHooked = true;

  var TAB_ROOTS = [$tabRootPathsJs];
  var THIS_TAB = $tabIndex;

  function tabIndexForPath(p) {
    for (var i = 0; i < TAB_ROOTS.length; i++) {
      var root = TAB_ROOTS[i];
      if (root === '/') { if (p === '/') return i; continue; }
      if (p === root || p.indexOf(root + '/') === 0) return i;
    }
    return null;
  }

  function checkPath(path) {
    var p = path || window.location.pathname;

    if (p === '/login') {
      var search = window.location.search;
      var isRealContent = search.indexOf('complete=1') !== -1 || search.indexOf('denied=') !== -1;
      if (!isRealContent) {
        SoocherBridge.postMessage(JSON.stringify({ type: 'login_detected' }));
      } else if (search.indexOf('denied=') !== -1) {
        SoocherBridge.postMessage(JSON.stringify({ type: 'role_denied', search: search }));
      }
      return;
    }

    var roomMatch = p.match(/\\/consultations\\/([^\\/?#]+)\\/room/) ||
                    p.match(/\\/video-call\\/([^\\/?#]+)/);
    if (roomMatch) {
      var cid = roomMatch[1];
      setTimeout(function() { history.back(); }, 30);
      try {
        var req = indexedDB.open('firebaseLocalStorageDb', 1);
        req.onsuccess = function(e) {
          var db = e.target.result;
          var all = db.transaction(['firebaseLocalStorage'], 'readonly')
                      .objectStore('firebaseLocalStorage').getAll();
          all.onsuccess = function() {
            var uid = null, token = null;
            for (var i = 0; i < all.result.length; i++) {
              var item = all.result[i];
              if (item.fbase_key && item.fbase_key.indexOf('authUser') !== -1) {
                uid   = item.value && item.value.uid;
                token = item.value && item.value.stsTokenManager &&
                        item.value.stsTokenManager.accessToken;
                break;
              }
            }
            SoocherBridge.postMessage(JSON.stringify({
              type: 'join_call', uid: uid, idToken: token, consultationId: cid
            }));
          };
          all.onerror = function() {
            SoocherBridge.postMessage(JSON.stringify({ type: 'error', message: 'IndexedDB read failed' }));
          };
        };
      } catch(e) {
        SoocherBridge.postMessage(JSON.stringify({ type: 'error', message: String(e) }));
      }
      return;
    }

    var chatMatch = p.match(/\\/consultations\\/([^\\/?#]+)\\/(?:chat|messages)\$/) ||
                    p.match(/\\/messages\\/([^\\/?#]+)\$/) ||
                    p.match(/\\/chat\\/([^\\/?#]+)\$/);
    if (chatMatch) {
      var chatCid = chatMatch[1];
      setTimeout(function() { history.back(); }, 30);
      SoocherBridge.postMessage(JSON.stringify({
        type: 'open_chat', consultationId: chatCid
      }));
      return;
    }

    if (p === '/messages') {
      setTimeout(function() { history.back(); }, 30);
      SoocherBridge.postMessage(JSON.stringify({ type: 'open_chat_list' }));
      return;
    }

    var targetTab = tabIndexForPath(p);
    if (targetTab !== null && targetTab !== THIS_TAB) {
      setTimeout(function() { history.back(); }, 30);
      SoocherBridge.postMessage(JSON.stringify({
        type: 'cross_tab_nav', url: window.location.href, tabIndex: targetTab
      }));
    }
  }

  var origPush = history.pushState.bind(history);
  history.pushState = function(s, t, url) {
    origPush(s, t, url);
    if (url) checkPath(typeof url === 'string' ? url : (url.pathname || ''));
  };

  var origReplace = history.replaceState.bind(history);
  history.replaceState = function(s, t, url) {
    origReplace(s, t, url);
    if (url) checkPath(typeof url === 'string' ? url : (url.pathname || ''));
  };

  window.addEventListener('popstate', function() { checkPath(window.location.pathname); });
})();
''');
  }
```

- [ ] **Step 2: Add video/chat handoff and the bridge message handler**

Add these methods (also to the mixin body):

```dart
  // ── Video call / chat handoff ────────────────────────────────────────────

  void _requestVideoCallData(String consultationId) {
    if (_joiningCall) return;
    final eid = consultationId.replaceAll("'", r"\'");
    wvc.runJavaScript('''
(function() {
  var cid = '$eid';
  try {
    var req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onsuccess = function(e) {
      var all = e.target.result
                  .transaction(['firebaseLocalStorage'], 'readonly')
                  .objectStore('firebaseLocalStorage').getAll();
      all.onsuccess = function() {
        var uid = null, token = null;
        for (var i = 0; i < all.result.length; i++) {
          var item = all.result[i];
          if (item.fbase_key && item.fbase_key.indexOf('authUser') !== -1) {
            uid   = item.value && item.value.uid;
            token = item.value && item.value.stsTokenManager &&
                    item.value.stsTokenManager.accessToken;
            break;
          }
        }
        SoocherBridge.postMessage(JSON.stringify({
          type: 'join_call', uid: uid, idToken: token, consultationId: cid
        }));
      };
    };
  } catch(e) {
    SoocherBridge.postMessage(JSON.stringify({ type: 'error', message: String(e) }));
  }
})();
''');
  }

  void _requestChatData(String consultationId) {
    if (_openingChat) return;
    final eid = consultationId.replaceAll("'", r"\'");
    wvc.runJavaScript('''
SoocherBridge.postMessage(JSON.stringify({
  type: 'open_chat',
  consultationId: '$eid'
}));
''');
  }

  void _requestChatList() {
    if (_openingChat) return;
    wvc.runJavaScript('''
SoocherBridge.postMessage(JSON.stringify({ type: 'open_chat_list' }));
''');
  }

  // ── Bridge message handler ───────────────────────────────────────────────

  Future<void> _onBridgeMessage(JavaScriptMessage msg) async {
    try {
      final data = jsonDecode(msg.message) as Map<String, dynamic>;
      switch (data['type'] as String?) {
        case 'logout':
          callbacks.onLoginDetected();

        case 'login_detected':
          callbacks.onLoginDetected();

        case 'role_denied':
          final search = data['search'] as String? ?? '';
          final denied = deniedLoginInfo('https://x/login$search');
          if (denied != null) _handleRoleDenied(denied);

        case 'cross_tab_nav':
          final url = data['url'] as String?;
          final idx = data['tabIndex'] as int?;
          if (url != null && idx != null) callbacks.onCrossTabNavigate(url, idx);

        case 'join_call':
          if (_joiningCall) return;
          final cid = data['consultationId'] as String?;
          if (cid == null || cid.isEmpty) {
            _showSnack('Missing consultation ID.');
            return;
          }
          final user = FirebaseAuth.instance.currentUser;
          if (user == null) {
            _showSnack('Not signed in.');
            return;
          }
          setState(() => _joiningCall = true);
          user
              .getIdToken(true)
              .then((tok) {
                if (tok == null) {
                  setState(() => _joiningCall = false);
                  _showSnack('Could not refresh token.');
                  return;
                }
                _openNativeVideoCall(user.uid, tok, cid);
              })
              .catchError((e) {
                setState(() => _joiningCall = false);
                _showSnack('Auth error: $e');
              });

        case 'open_chat':
          if (_openingChat) return;
          final cid = data['consultationId'] as String?;
          if (cid == null || cid.isEmpty) {
            _showSnack('Missing consultation ID.');
            return;
          }
          final user = FirebaseAuth.instance.currentUser;
          if (user == null) {
            _showSnack('Not signed in.');
            return;
          }
          setState(() => _openingChat = true);
          user
              .getIdToken(true)
              .then((tok) {
                if (tok == null) {
                  setState(() => _openingChat = false);
                  _showSnack('Could not refresh token.');
                  return;
                }
                _openNativeChat(user.uid, tok, cid, user.displayName);
              })
              .catchError((e) {
                setState(() => _openingChat = false);
                _showSnack('Auth error: $e');
              });

        case 'open_chat_list':
          if (_openingChat || isDoctor) return;
          final user = FirebaseAuth.instance.currentUser;
          if (user == null) {
            _showSnack('Not signed in.');
            return;
          }
          setState(() => _openingChat = true);
          user
              .getIdToken(true)
              .then((tok) {
                if (tok == null) {
                  setState(() => _openingChat = false);
                  _showSnack('Could not refresh token.');
                  return;
                }
                _openNativeChatList(user.uid, tok, user.displayName);
              })
              .catchError((e) {
                setState(() => _openingChat = false);
                _showSnack('Auth error: $e');
              });

        case 'file_picker':
          final fieldId = data['fieldId'] as String? ?? '';
          final accept = data['accept'] as String? ?? '';
          if (fieldId.isEmpty) return;
          await _handleNativeFilePicker(fieldId, accept);

        case 'pull_refresh':
          await _handlePullToRefresh();

        case 'date_picker':
          final fieldId = data['fieldId'] as String? ?? '';
          final current = data['currentValue'] as String? ?? '';
          DateTime initial = DateTime.now();
          if (current.isNotEmpty) {
            initial = DateTime.tryParse(current) ?? initial;
          }
          if (!mounted) return;
          final picked = await showDatePicker(
            context: context,
            initialDate: initial,
            firstDate: DateTime(1900),
            lastDate: DateTime(2100),
            builder: (ctx, child) => Theme(
              data: Theme.of(ctx).copyWith(
                colorScheme: const ColorScheme.light(
                  primary: Color(0xFF2E6DD4),
                  onPrimary: Colors.white,
                  surface: Colors.white,
                ),
              ),
              child: child!,
            ),
          );
          if (picked != null && fieldId.isNotEmpty) {
            final formatted =
                '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
            _setDateInputValue(fieldId, formatted);
          }

        case 'error':
          _showSnack('Error: ${data['message']}');
      }
    } catch (_) {}
  }

  Future<void> _openNativeVideoCall(String uid, String idToken, String cid) async {
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => VideoCallScreen(
          uid: uid,
          idToken: idToken,
          consultationId: cid,
          isDoctor: isDoctor,
        ),
      ),
    );
    if (mounted) setState(() => _joiningCall = false);
  }

  Future<void> _openNativeChat(
    String uid,
    String idToken,
    String cid,
    String? displayName,
  ) async {
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatScreen(
          uid: uid,
          idToken: idToken,
          consultationId: cid,
          isDoctor: isDoctor,
          webBaseUrl: baseUrl,
          displayName: displayName,
        ),
      ),
    );
    if (mounted) setState(() => _openingChat = false);
  }

  Future<void> _openNativeChatList(String uid, String idToken, String? displayName) async {
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatListScreen(
          uid: uid,
          idToken: idToken,
          isDoctor: isDoctor,
          webBaseUrl: baseUrl,
          displayName: displayName,
        ),
      ),
    );
    if (mounted) setState(() => _openingChat = false);
  }

  // ── External app links (UPI intents, Play Store, etc.) ───────────────────

  Future<bool> _tryLaunchExternal(String url) async {
    if (url.startsWith('intent://')) return _launchIntentUrl(url);
    try {
      return await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('[ExternalLaunch][tab$tabIndex] failed for $url: $e');
      return false;
    }
  }

  Future<bool> _launchIntentUrl(String url) async {
    final split = url.indexOf('#Intent;');
    if (split == -1) return false;
    final body = url.substring('intent://'.length, split);
    final params = url.substring(split + '#Intent;'.length);

    String? scheme, package, fallback;
    for (final part in params.split(';')) {
      if (part.startsWith('scheme=')) {
        scheme = part.substring('scheme='.length);
      } else if (part.startsWith('package=')) {
        package = part.substring('package='.length);
      } else if (part.startsWith('S.browser_fallback_url=')) {
        fallback = Uri.decodeComponent(part.substring('S.browser_fallback_url='.length));
      }
    }

    if (scheme != null) {
      try {
        final rewritten = Uri.parse('$scheme://$body');
        if (await launchUrl(rewritten, mode: LaunchMode.externalApplication)) {
          return true;
        }
      } catch (e) {
        debugPrint('[ExternalLaunch][tab$tabIndex] rewritten intent failed: $e');
      }
    }

    for (final candidate in [
      fallback,
      if (package != null) 'market://details?id=$package',
    ]) {
      if (candidate == null) continue;
      try {
        if (await launchUrl(Uri.parse(candidate), mode: LaunchMode.externalApplication)) {
          return true;
        }
      } catch (e) {
        debugPrint('[ExternalLaunch][tab$tabIndex] fallback "$candidate" failed: $e');
      }
    }
    return false;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF2E6DD4),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Attaches the `SoocherBridge` JS channel and (Android only) the native
  /// file-selector hook to `controller`. Call once, from `initState`.
  void wireBridgeAndInjections(WebViewController controller) {
    controller.addJavaScriptChannel('SoocherBridge', onMessageReceived: _onBridgeMessage);
    final platform = controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setOnShowFileSelector(_onShowFileSelector);
    }
  }
```

- [ ] **Step 3: Static analysis**

Run: `cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main && flutter analyze lib/services/soocher_webview_bridge.dart`
Expected: no errors. `_requestVideoCallData` etc. are now all defined; `context` resolves via `State<T>`.

- [ ] **Step 4: Commit**

```bash
cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main
git add lib/services/soocher_webview_bridge.dart
git commit -m "Port JS injections and bridge handler into the shared mixin"
```

---

### Task 5: `SoocherTabWebView` widget

**Files:**
- Create: `lib/screens/soocher_tab_webview.dart`

**Interfaces:**
- Consumes: `soocherUserAgent`, `SoocherTabCallbacks`, `SoocherWebViewBridge` mixin from Task 4.
- Produces: `SoocherTabWebView({Key? key, required String initialUrl, required bool isDoctor, required String baseUrl, required List<String> tabRootPaths, required int tabIndex, required SoocherTabCallbacks callbacks})`, plus `SoocherTabWebViewState` with a public `WebViewController get controller` — the shell (Task 6) needs this to call `loadRequest` on a sibling tab for cross-tab navigation, so it's obtained via a `GlobalKey<SoocherTabWebViewState>` per tab.

- [ ] **Step 1: Create the widget**

Create `lib/screens/soocher_tab_webview.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../services/soocher_webview_bridge.dart';

/// One tab's WebView. Loads [initialUrl] once and is kept alive by the
/// shell's `IndexedStack` when the user switches to another tab — no
/// reload, scroll position preserved.
class SoocherTabWebView extends StatefulWidget {
  const SoocherTabWebView({
    super.key,
    required this.initialUrl,
    required this.isDoctor,
    required this.baseUrl,
    required this.tabRootPaths,
    required this.tabIndex,
    required this.callbacks,
  });

  final String initialUrl;
  final bool isDoctor;
  final String baseUrl;
  final List<String> tabRootPaths;
  final int tabIndex;
  final SoocherTabCallbacks callbacks;

  @override
  State<SoocherTabWebView> createState() => SoocherTabWebViewState();
}

class SoocherTabWebViewState extends State<SoocherTabWebView>
    with SoocherWebViewBridge<SoocherTabWebView> {
  late final WebViewController _controller;

  @override
  WebViewController get wvc => _controller;
  @override
  bool get isDoctor => widget.isDoctor;
  @override
  String get baseUrl => widget.baseUrl;
  @override
  List<String> get tabRootPaths => widget.tabRootPaths;
  @override
  int get tabIndex => widget.tabIndex;
  @override
  SoocherTabCallbacks get callbacks => widget.callbacks;

  /// The shell (`WebViewScreen`) reaches this tab's controller through a
  /// `GlobalKey<SoocherTabWebViewState>` to load a URL here when cross-tab
  /// navigation resolves to this tab.
  WebViewController get controller => _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF8FAFC))
      ..setUserAgent(soocherUserAgent)
      ..enableZoom(false)
      ..setOnConsoleMessage(
        (msg) => debugPrint('[WebConsole][tab$tabIndex] ${msg.level.name}: ${msg.message}'),
      )
      ..setNavigationDelegate(buildNavigationDelegate());
    wireBridgeAndInjections(_controller);
    _controller.loadRequest(Uri.parse(widget.initialUrl));
  }

  @override
  Widget build(BuildContext context) {
    return hasError ? _errorView() : WebViewWidget(controller: _controller);
  }

  Widget _errorView() {
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 64, color: Color(0xFF2E6DD4)),
              const SizedBox(height: 16),
              const Text(
                'No connection',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Check your internet connection\nand try again.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.5),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => retryLoad(widget.initialUrl),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E6DD4),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                  elevation: 0,
                ),
                child: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Static analysis**

Run: `cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main && flutter analyze lib/screens/soocher_tab_webview.dart lib/services/soocher_webview_bridge.dart`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main
git add lib/screens/soocher_tab_webview.dart
git commit -m "Add SoocherTabWebView widget"
```

---

### Task 6: Rewrite `WebViewScreen` as the tabbed shell

**Files:**
- Modify: `lib/screens/web_view_screen.dart` (full-file replacement, currently 1656 lines)

**Interfaces:**
- Consumes: `soocherUserAgent`, `SoocherTabCallbacks` (Task 2), `SoocherTabWebView`/`SoocherTabWebViewState` (Task 5).
- Produces: `WebViewScreen({Key? key, Map<String, dynamic>? userDetails, String? loginRole})` — unchanged public shape, consumed by `login_screen.dart` and `splash_screen.dart` (neither needs changes).

- [ ] **Step 1: Replace the file**

Replace the full contents of `lib/screens/web_view_screen.dart` with:

```dart
import 'dart:async';
import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:stream_chat/stream_chat.dart' as stream;
import 'package:webview_flutter/webview_flutter.dart';

import '../config/stream_config.dart';
import '../services/chat_service.dart';
import '../services/soocher_webview_bridge.dart';
import 'login_screen.dart';
import 'soocher_tab_webview.dart';

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

class _Tab {
  const _Tab(this.label, this.path, this.icon);
  final String label;
  final String path;
  final IconData icon;
}

const _patientTabs = [
  _Tab('Home', '/', Icons.home_rounded),
  _Tab('Find', '/doctors', Icons.medical_services_rounded),
  _Tab('Bookings', '/bookings', Icons.event_available_rounded),
  _Tab('Profile', '/profile', Icons.person_rounded),
];

const _doctorTabs = [
  _Tab('Home', '/doc/dashboard', Icons.home_rounded),
  _Tab('Consultations', '/doc/consultations', Icons.event_available_rounded),
  _Tab('Messages', '/doc/messages', Icons.chat_bubble_rounded),
  _Tab('Profile', '/doc/profile', Icons.badge_rounded),
];

class _WebViewScreenState extends State<WebViewScreen> {
  static const _baseUrl = 'https://soocher.in';
  static const _doctorPrefix = '/doc';

  String _tokenApi = '$_baseUrl/api/native-auth-token';
  String _nativeAuth = '$_baseUrl/native-auth';

  String? _userType;
  bool get _isDoctor => _userType == 'DOCTOR';

  // ── Boot-phase state (single WebView, exactly today's flow) ─────────────
  late final WebViewController _bootWvc;
  bool _bootDone = false;
  bool _bootHasError = false;
  bool _signingIn = false;
  bool _enteredApp = false;

  // ── Tabbed-shell state (after boot succeeds) ─────────────────────────────
  int _activeIndex = 0;
  late List<_Tab> _tabs;
  late List<GlobalKey<SoocherTabWebViewState>> _tabKeys;
  stream.StreamChatClient? _badgeClient;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _bootWvc = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF8FAFC))
      ..setUserAgent(soocherUserAgent)
      ..enableZoom(false)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (req) {
            final url = req.url;
            if (url.startsWith('https://') || url.startsWith('http://')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
          onPageFinished: (url) {
            debugPrint('[Boot][PageFinished] url=$url');
            if (_isLoginUrl(url)) {
              _handleLoginDetected();
              return;
            }
            final denied = _deniedLoginInfo(url);
            if (denied != null) {
              _handleRoleDenied(denied.role, denied.message);
              return;
            }
            if (!_isAuthFlowUrl(url)) {
              _enteredApp = true;
              _enterTabbedShell();
            }
          },
        ),
      );
    _init();
  }

  // ── Base-site resolution (DOCTOR vs PATIENT) ──────────────────────────────

  Future<void> _init() async {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      _userType = 'PATIENT';
      _bootWvc.loadRequest(Uri.parse('$_baseUrl/'));
      _enteredApp = true;
      _enterTabbedShell();
      return;
    }

    final idTokenFuture = currentUser.getIdToken();
    final type = widget.loginRole ?? await _resolveUserType();
    _applyBaseUrl(type);
    _loadWithCustomToken(idTokenFuture: idTokenFuture);
  }

  Future<String?> _resolveUserType() async {
    final fromLogin =
        (widget.userDetails?['firestoreProfile'] as Map?)?['type'] as String?;
    if (fromLogin != null) return fromLogin;
    try {
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid == null) return null;
      final snap = await FirebaseFirestore.instance
          .collection('Users')
          .doc(uid)
          .get()
          .timeout(const Duration(seconds: 8));
      return snap.data()?['type'] as String?;
    } catch (e) {
      debugPrint('[SoocherAuth] could not resolve user type: $e');
      return null;
    }
  }

  void _applyBaseUrl(String? type) {
    _userType = type;
    final prefix = type == 'DOCTOR' ? _doctorPrefix : '';
    _tokenApi = '$_baseUrl/api$prefix/native-auth-token';
    _nativeAuth = '$_baseUrl$prefix/native-auth';
    debugPrint('[SoocherAuth] type=$type → nativeAuth=$_nativeAuth');
  }

  // ── Custom-token auth flow (boot phase only — identical to before) ──────

  bool _isLoginUrl(String url) {
    final uri = Uri.tryParse(url);
    if ((uri?.path ?? '') != '/login') return false;
    final params = uri?.queryParameters;
    if (params?['complete'] == '1') return false;
    if (params?.containsKey('denied') ?? false) return false;
    return true;
  }

  ({String role, String message})? _deniedLoginInfo(String url) {
    final uri = Uri.tryParse(url);
    if ((uri?.path ?? '') != '/login') return null;
    final denied = uri?.queryParameters['denied'];
    if (denied == null) return null;
    if (denied == 'already-doctor') {
      return (
        role: 'PATIENT',
        message: "This number is registered as a doctor — use Doctor Login.",
      );
    }
    return (
      role: 'DOCTOR',
      message: "This number is registered as a patient — use Patient Login.",
    );
  }

  bool _isAuthFlowUrl(String url) {
    final uri = Uri.tryParse(url);
    final p = uri?.path ?? '';
    if (p == '/login') {
      final params = uri?.queryParameters;
      final isRealContent =
          params?['complete'] == '1' || (params?.containsKey('denied') ?? false);
      if (isRealContent) return false;
    }
    return p == '/login' || p == '/native-auth' || p == '/doc/native-auth';
  }

  Future<void> _loadWithCustomToken({Future<String?>? idTokenFuture}) async {
    if (_signingIn) return;
    setState(() => _signingIn = true);

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _doSignOut();
      return;
    }

    try {
      final idToken = await (idTokenFuture ?? user.getIdToken())
          .timeout(const Duration(seconds: 8));
      final res = await http
          .post(
            Uri.parse(_tokenApi),
            headers: {
              'Authorization': 'Bearer $idToken',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        final customToken = body['customToken'] as String?;
        if (customToken != null && customToken.isNotEmpty) {
          final uri = Uri.parse(_nativeAuth).replace(queryParameters: {'ct': customToken});
          _bootWvc.loadRequest(uri);
          setState(() => _signingIn = false);
          return;
        }
      }

      if (res.statusCode == 409) {
        String message = 'Multiple accounts detected. Please contact admin.';
        try {
          final body = jsonDecode(res.body) as Map<String, dynamic>;
          final serverError = body['error'] as String?;
          if (serverError != null && serverError.isNotEmpty) message = serverError;
        } catch (_) {}
        setState(() => _signingIn = false);
        await _doSignOut(errorMessage: message);
        return;
      }
    } catch (e) {
      debugPrint('[SoocherAuth] exception: $e');
    }

    setState(() {
      _signingIn = false;
      _bootHasError = true;
    });
  }

  void _handleLoginDetected() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _doSignOut();
      return;
    }
    if (_enteredApp) {
      _doSignOut();
    } else {
      _loadWithCustomToken();
    }
  }

  Future<void> _doSignOut({String? errorMessage}) async {
    if (!mounted) return;
    await FirebaseAuth.instance.signOut();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      PageRouteBuilder(
        pageBuilder: (_, _, _) => LoginScreen(errorMessage: errorMessage),
        transitionDuration: const Duration(milliseconds: 350),
        transitionsBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: child),
      ),
      (_) => false,
    );
  }

  bool _handlingRoleDenied = false;

  void _handleRoleDenied(String role, String message) {
    if (_handlingRoleDenied) return;
    _handlingRoleDenied = true;
    unawaited(
      FirebaseAuth.instance.signOut().then((_) {
        if (!mounted) return;
        Navigator.of(context).pushAndRemoveUntil(
          PageRouteBuilder(
            pageBuilder: (_, _, _) => LoginScreen(role: role, errorMessage: message),
            transitionDuration: const Duration(milliseconds: 350),
            transitionsBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: child),
          ),
          (_) => false,
        );
      }),
    );
  }

  void _reload() {
    setState(() {
      _bootHasError = false;
      _signingIn = false;
    });
    _loadWithCustomToken();
  }

  // ── Enter the tabbed shell once boot succeeds ────────────────────────────

  void _enterTabbedShell() {
    if (_bootDone) return;
    _bootDone = true;
    _tabs = _isDoctor ? _doctorTabs : _patientTabs;
    _tabKeys = List.generate(_tabs.length, (_) => GlobalKey<SoocherTabWebViewState>());
    if (_isDoctor) _connectBadgeClient();
    setState(() {});
  }

  SoocherTabCallbacks get _callbacks => SoocherTabCallbacks(
    onLoginDetected: _handleLoginDetected,
    onRoleDenied: _handleRoleDenied,
    onCrossTabNavigate: (url, tabIndex) {
      _tabKeys[tabIndex].currentState?.controller.loadRequest(Uri.parse(url));
      setState(() => _activeIndex = tabIndex);
    },
  );

  // ── Doctor unread-message badge ──────────────────────────────────────────
  //
  // Independent of any tab's WebView — a native Stream client purely to
  // watch totalUnreadCount, so the Messages tab badge stays accurate
  // regardless of which tab is currently active.

  Future<void> _connectBadgeClient() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      final sanitizedUid = ChatService.sanitizeId(user.uid);
      final res = await http
          .post(
            Uri.parse('$_baseUrl/api/stream-token'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'userId': sanitizedUid}),
          )
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return;
      final token = (jsonDecode(res.body) as Map<String, dynamic>)['token'] as String?;
      if (token == null || token.isEmpty) return;

      final client = stream.StreamChatClient(StreamConfig.apiKey, logLevel: stream.Level.WARNING);
      await client.connectUser(stream.User(id: sanitizedUid), token);
      if (!mounted) {
        await client.disconnectUser();
        return;
      }
      _badgeClient = client;
      client.state.totalUnreadCountStream.listen((count) {
        if (mounted) setState(() => _unreadCount = count);
      });
    } catch (e) {
      debugPrint('[BadgeClient] failed to connect: $e');
    }
  }

  @override
  void dispose() {
    _badgeClient?.disconnectUser();
    super.dispose();
  }

  // ── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (_bootDone) {
          final activeController = _tabKeys[_activeIndex].currentState?.controller;
          if (activeController != null && await activeController.canGoBack()) {
            activeController.goBack();
            return;
          }
        } else if (await _bootWvc.canGoBack()) {
          _bootWvc.goBack();
          return;
        }
        SystemNavigator.pop();
      },
      child: _bootDone ? _tabbedScaffold() : _bootScaffold(),
    );
  }

  Widget _bootScaffold() {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: _bootHasError
          ? SafeArea(bottom: false, child: _bootErrorView())
          : WebViewWidget(controller: _bootWvc),
    );
  }

  Widget _tabbedScaffold() {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: IndexedStack(
        index: _activeIndex,
        children: List.generate(_tabs.length, (i) {
          final tab = _tabs[i];
          return SoocherTabWebView(
            key: _tabKeys[i],
            initialUrl: '$_baseUrl${tab.path}',
            isDoctor: _isDoctor,
            baseUrl: _baseUrl,
            tabRootPaths: _tabs.map((t) => t.path).toList(),
            tabIndex: i,
            callbacks: _callbacks,
          );
        }),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _activeIndex,
        onTap: (i) => setState(() => _activeIndex = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF2E6DD4),
        unselectedItemColor: const Color(0xFF94A3B8),
        items: List.generate(_tabs.length, (i) {
          final tab = _tabs[i];
          final showBadge = _isDoctor && tab.path == '/doc/messages' && _unreadCount > 0;
          return BottomNavigationBarItem(
            icon: showBadge
                ? Badge.count(count: _unreadCount, child: Icon(tab.icon))
                : Icon(tab.icon),
            label: tab.label,
          );
        }),
      ),
    );
  }

  Widget _bootErrorView() {
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 64, color: Color(0xFF2E6DD4)),
              const SizedBox(height: 16),
              const Text(
                'No connection',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Check your internet connection\nand try again.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.5),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _reload,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E6DD4),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                  elevation: 0,
                ),
                child: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Static analysis**

Run: `cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main && flutter analyze lib/screens/web_view_screen.dart lib/screens/soocher_tab_webview.dart lib/services/soocher_webview_bridge.dart`
Expected: no errors. If `stream_chat` isn't already a direct dependency (only `stream_chat_flutter` might be), check `pubspec.yaml` — `stream_chat_flutter` re-exports the core `stream_chat` package's `StreamChatClient`/`User`/`Level` types, so no new dependency should be needed; if analysis reports otherwise, add `stream_chat: ^9.0.0` (matching the `stream_chat_flutter: 9.27.0` major version already pinned) to `pubspec.yaml` and run `flutter pub get`.

- [ ] **Step 3: Commit**

```bash
cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main
git add lib/screens/web_view_screen.dart pubspec.yaml pubspec.lock
git commit -m "Rewrite WebViewScreen as a native tabbed shell"
```

---

### Task 7: Build, install, and manual verification

**Files:** none (verification only).

- [ ] **Step 1: Full build**

Run: `cd /Users/apple/Documents/PP/SOOCHER-APP-FLUTTER/soocher-doctor-app-main && flutter build ios --debug --simulator`
Expected: exit code 0.

- [ ] **Step 2: Install and launch**

```bash
xcrun simctl uninstall 02213C90-3ECB-42F6-B43A-A55EC2924197 com.soocher.doctor.app
xcrun simctl install 02213C90-3ECB-42F6-B43A-A55EC2924197 build/ios/iphonesimulator/Runner.app
xcrun simctl launch 02213C90-3ECB-42F6-B43A-A55EC2924197 com.soocher.doctor.app
```

- [ ] **Step 3: Manual verification — patient side**

1. Sign in as a patient. Confirm the native bottom nav appears (Home / Find / Bookings / Profile) and the web's own bottom nav does not.
2. Tap each tab — confirm instant switching (no reload/flash) and each tab keeps its scroll position when you switch away and back.
3. From Home, tap a link that leads to `/doctors` (e.g. "Find a doctor") — confirm the Find tab becomes active AND shows the doctor list (not a stale/blank Find tab).
4. Join a video call and open chat from a booking — confirm both still open as native full-screen screens regardless of which tab you triggered them from.

- [ ] **Step 4: Manual verification — doctor side**

1. Sign in as a doctor. Confirm the native bottom nav shows Home / Consultations / Messages / Profile.
2. Confirm the Messages tab badge shows the correct unread count, and updates when a new message arrives while you're on a different tab.
3. Tap into a conversation from the Messages tab's web list — confirm it opens the native `ChatScreen`.
4. Trigger a role-mismatch login (per the existing native-login-split flow) — confirm it still bounces to the native `LoginScreen`, not a web-rendered denial screen inside any tab.

- [ ] **Step 5: Regression check**

Force-quit and relaunch the app while signed in — confirm the splash-screen relaunch path (`WebViewScreen(userDetails: details)`, no `loginRole`) still resolves role from Firestore and lands in the tabbed shell correctly, with no login screen shown.

---

## Self-Review Notes

- **Spec coverage:** "Tabs" table → Task 6's `_patientTabs`/`_doctorTabs`. "Architecture" (shared bridge, one WebView per tab) → Tasks 2-5. "Cross-tab navigation (auto-switch)" → Task 3's `tabIndexForPath`/`onCrossTabNavigate` plumbing, both in the Dart nav delegate and the injected JS route hook. "Unread badge" → Task 6's `_connectBadgeClient`. "Hiding the web nav in-app" → Task 1 (web) + Task 5's `soocherUserAgent` (Flutter). "Data Flow Summary" steps 1-5 → covered across Tasks 6 (boot→shell), 3 (cross-tab), 4 (chat/video handoff), 6 (role-denial). "Error Handling" (per-tab error view, fail-open cross-tab matching) → Task 5's `_errorView`/`retryLoad`, Task 3's `tabIndexForPath` returning null on no match. "Testing" section → Task 7.
- **Placeholder scan:** none — every step has literal, complete code.
- **Type consistency:** `SoocherTabCallbacks` fields (`onLoginDetected`, `onRoleDenied(String,String)`, `onCrossTabNavigate(String,int)`) defined once in Task 2, consumed identically in Task 3's delegate and Task 6's `_callbacks` getter. `SoocherWebViewBridge`'s abstract requirements (`wvc`, `isDoctor`, `baseUrl`, `tabRootPaths`, `tabIndex`, `callbacks`) defined in Task 2, implemented identically by `SoocherTabWebViewState` in Task 5. `WebViewScreen({Key? key, Map<String, dynamic>? userDetails, String? loginRole})` unchanged from the pre-existing signature both `login_screen.dart` and `splash_screen.dart` already call.
