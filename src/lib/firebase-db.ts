import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { firebaseApp } from "./firebase-app";

/**
 * Persist Firestore's cache to IndexedDB instead of keeping it in memory.
 *
 * Without this, every visit to Bookings started a cold network query and the
 * page sat on its skeleton until the server answered. With it, an onSnapshot
 * listener fires immediately from the local cache and then updates again when
 * the server responds — so returning to a page you have already opened paints
 * real content right away.
 *
 * `initializeFirestore` must run before anything calls `getFirestore`, which is
 * why every consumer imports `db` from this module.
 */
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    // The web app and the native WebView can both be open; multi-tab keeps them
    // from fighting over the same IndexedDB lease.
    tabManager: persistentMultipleTabManager(),
  }),
});
