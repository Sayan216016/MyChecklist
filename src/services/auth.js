import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase.js";
import { claimPendingInvites } from "./db.js";

export function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await claimPendingInvites(user);
      } catch (e) {
        console.error(e);
      }
    }
    callback(user);
  });
}

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}
