import { getFirestore } from "firebase/firestore";
import { firebaseApp } from "./firebase-app";

export const db = getFirestore(firebaseApp);

