import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "../firebase-config.js";

export const configMissing = !firebaseConfig?.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY";

let app = null;
export let auth = null;
export let db = null;
export const googleProvider = new GoogleAuthProvider();

if (!configMissing) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}
