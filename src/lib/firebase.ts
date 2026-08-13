// Backwards-compatible barrel. New code should import only the Firebase service
// it uses so pages that only need Auth do not also download Firestore/Storage.
export { firebaseApp as default } from "./firebase-app";
export { auth } from "./firebase-auth";
export { db } from "./firebase-db";
export { storage } from "./firebase-storage";
