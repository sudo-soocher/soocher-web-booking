# Native Bottom Nav (Flutter App) — Design

**Goal:** Replace the web-rendered bottom nav bar inside the Flutter app's WebView with a native Flutter `BottomNavigationBar`, wrapping one persistent WebView per tab so tab switches are instant and each tab keeps its own scroll/UI state.

**Scope:** `SOOCHER-APP-FLUTTER/soocher-doctor-app-main` (new tabbed shell) and `SOOCHER-USER-WEB/soocher-web-booking` (hide the web nav when running inside the app). Applies to both the patient and doctor sides of the app — they get separate, role-specific tab sets.

## Background

Today `WebViewScreen` owns exactly one `WebViewController` for the whole app session. The bottom nav the user sees is rendered by the web app itself — `MobileBottomNav.tsx` (patient) or `BottomNav.tsx` (doctor) — inside that same WebView. Tapping a nav item is a normal in-page navigation.

All the app's native WebView behavior (video-call/chat handoff, login-denied interception, focus-scroll fix, pull-to-refresh, date-picker fix, etc.) lives as instance methods on `_WebViewScreenState`, wired to that single `WebViewController`'s `NavigationDelegate` and JS bridge channel.

## Tabs

Pulled from the current web nav components — no new tabs, no new routes:

| Role | Tab | Path |
|---|---|---|
| Patient | Home | `/` |
| Patient | Find | `/doctors` |
| Patient | Bookings | `/bookings` |
| Patient | Profile | `/profile` |
| Doctor | Home | `/doc/dashboard` |
| Doctor | Consultations | `/doc/consultations` |
| Doctor | Messages | `/doc/messages` |
| Doctor | Profile | `/doc/profile` |

## Architecture

`WebViewScreen` (class name and constructor — `{userDetails, loginRole}` — stay unchanged so `login_screen.dart` and `splash_screen.dart` call sites don't need to change) becomes a shell:

- A `Scaffold` with a native `BottomNavigationBar` (4 items, role-specific set above) and an `IndexedStack` body holding one `SoocherTabWebView` per tab.
- Each `SoocherTabWebView` owns its own `WebViewController`, loads its tab's root URL once on first build, and is kept alive (not rebuilt) when the user switches away — `IndexedStack` keeps all four in the widget tree, only toggling visibility, which is what preserves scroll position and in-page state across switches.
- The four WebViewControllers share the platform's default (persistent) cookie/localStorage data store, so the signed-in session is shared automatically — no separate auth handoff needed per tab.

### Shared bridge logic

All existing interception/injection logic (video-call and chat URL matching, `SoocherBridge` message handling, login-denied redirect, focus-scroll fix, pull-to-refresh, date-picker fix, file-picker, header-padding fix, error capture) moves out of `_WebViewScreenState` into a mixin, e.g. `SoocherWebViewBridge<T extends StatefulWidget>`, that `_SoocherTabWebViewState` applies. This is the bulk of the refactor — mechanical extraction, not new logic. Anything that navigates to a full-screen native route (video call, chat, chat list, native login on role-denial) does so via `Navigator.of(context)`, which resolves to the app's single root Navigator regardless of which tab triggered it — no per-tab Navigator needed.

### Cross-tab navigation ("auto-switch")

If a page inside tab A's WebView links to a route that belongs to a different tab (e.g., a "browse doctors" link on Home going to `/doctors`, which is the Find tab's root), the shell must switch to Find AND show that destination — not just flip the visible index while the actual content stays loaded in Home's WebView.

Mechanism: the shared mixin's `onNavigationRequest` checks the target URL's path against the shell's known tab-root prefixes (longest-prefix match). If it resolves to a tab other than the one this controller belongs to:
1. `return NavigationDecision.prevent` — stop tab A's WebView from navigating there itself.
2. Report the target URL + resolved tab index up to the shell (via a callback each `SoocherTabWebView` is given).
3. The shell calls `loadRequest(url)` on the target tab's controller and sets it as the active index.

The same check applies to in-page client-side navigation (`history.pushState`/`replaceState`, already caught by the existing injected route hook) — the JS hook's `checkPath` needs the same tab-root list so it can post a `cross_tab_nav` bridge message instead of letting the SPA route change stay in the wrong tab's WebView.

### Unread badge (doctor Messages tab)

The shell connects a lightweight `StreamChatClient` (same Stream API key already used by `ChatScreen`/`ChatListScreen`) independently of any tab's WebView, purely to listen to `client.state.totalUnreadCount` and paint the badge on the Messages tab icon. This runs only for the doctor role. It reuses whatever Stream user-connect flow `ChatListScreen`/`chat_service.dart` already has for resolving the signed-in user's Stream credentials.

### Hiding the web nav in-app

The Flutter WebViewController's user agent (`_userAgent` in `web_view_screen.dart`) gets a distinguishing token appended (e.g. `SoocherApp/1.0`). `MobileBottomNav.tsx` and `BottomNav.tsx` check `navigator.userAgent.includes('SoocherApp')` and render `null` when true — same pattern as their existing route-based hiding, just one more early-return condition. This means the web nav still renders normally for browser/PWA users; only the in-app WebView loses it.

## Data Flow Summary

1. `WebViewScreen` resolves role (as it does today via `_resolveUserType()`/`loginRole`), builds the 4 role-specific tabs, and mounts `IndexedStack` with 4 `SoocherTabWebView` widgets, index 0 active.
2. User taps a native `BottomNavigationBar` item → shell sets `_activeIndex`, no reload (`IndexedStack` just changes what's visible/hit-testable).
3. User taps an in-page link to another tab's route → mixin's navigation delegate intercepts, shell loads it in the correct tab's controller and switches to it (see above).
4. User taps a chat/video-call/messages-list link → same native handoff as today, via `Navigator.of(context)`, regardless of active tab.
5. Web role-denial redirect (`/login?denied=...`) on any tab → same native `LoginScreen` bounce as today, via the mixin.

## Error Handling

- If a tab's `WebViewController` fails to load (network error, 5xx), that tab shows the existing native error/retry screen (`_hasError` state) scoped to that tab only — the other three tabs stay usable.
- Cross-tab navigation interception failing open (falling through to `NavigationDecision.navigate` on any error in the prefix-matching logic) is acceptable — worst case is the pre-existing "tab-mismatch" behavior (content navigates, nav highlight doesn't follow), not a crash.

## Testing

- Manual, on the iOS simulator (existing build/install/launch cycle): verify each tab loads its correct root URL, switching tabs is instant with no reload, scroll position is preserved per tab.
- Verify chat/video-call handoff still works from every tab it's reachable from (doctor Messages tab list, consultation detail pages inside Home/Consultations tabs).
- Verify cross-tab navigation: tap an in-page link on Home that goes to a Find/Bookings/Profile route, confirm the correct tab both becomes active AND shows the destination content (not the tab's stale root page).
- Verify the doctor Messages tab badge updates when a new message arrives while on a different tab.
- Verify the web nav (`MobileBottomNav`/`BottomNav`) still shows normally when the same URLs are opened in a regular mobile browser (not just inside the app).
