import { getApp, getApps, initializeApp } from "firebase/app";

if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.warn("Firebase API Key is missing. Check your environment variables.");
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// App Check is valuable, but reCAPTCHA is not part of the critical rendering
// path. Loading it after the browser becomes idle keeps it out of every page's
// initial Firebase bundle and avoids competing with the first Firestore read.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY) {
  const startAppCheck = async () => {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import("firebase/app-check");

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      (window as typeof window & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY!),
      isTokenAutoRefreshEnabled: true,
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => void startAppCheck(), { timeout: 3000 });
  } else {
    setTimeout(() => void startAppCheck(), 1);
  }
}
