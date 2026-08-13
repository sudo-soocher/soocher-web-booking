import { firebaseApp } from "./firebase-app";

/**
 * App Check (reCAPTCHA v3), started eagerly at module load.
 *
 * The patient app previously deferred this to `requestIdleCallback`. The doctor
 * app had already hit the failure that causes: Firebase phone auth sends its
 * request before App Check has a token and the call fails with
 * `INVALID_APP_CREDENTIAL`. Deferring is only safe if nothing races it, and
 * client-side phone OTP does.
 *
 * The reCAPTCHA SDK is still behind a dynamic `import()`, so it stays out of the
 * initial bundle — only the *start* is eager, not the download.
 *
 * Local development deliberately skips App Check. A generated debug token must
 * be registered in Firebase before it can be exchanged; enabling it implicitly
 * on every localhost session produced a 403 on every Auth request. Production
 * still initializes eagerly whenever the public site key is configured.
 *
 * `appCheckReady` is the gate: any code that triggers phone auth should await it
 * first. It resolves rather than rejects on failure, so a broken App Check
 * config degrades to "no token" instead of hanging the sign-in flow.
 */
export const appCheckReady: Promise<void> =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? (async () => {
        const { initializeAppCheck, ReCaptchaV3Provider } = await import(
          "firebase/app-check"
        );

        initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaV3Provider(
            process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY!
          ),
          isTokenAutoRefreshEnabled: true,
        });
      })().catch((err) => {
        console.error("App Check init failed:", err);
      })
    : Promise.resolve();
