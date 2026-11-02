import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { normalizeEmail } from "./util.js";

export async function claimPendingInvites(user) {
  const email = normalizeEmail(user.email || "");
  if (!email) return;

  const q = query(
    collection(db, "checklists"),
    where("invitedEmails", "array-contains", email),
  );
  const snap = await getDocs(q);

  for (const listDoc of snap.docs) {
    const data = listDoc.data();
    if (data.memberIds?.includes(user.uid)) continue;

    const listRef = listDoc.ref;
    const memberRef = doc(listRef, "members", user.uid);

    const batch = writeBatch(db);
    batch.update(listRef, {
      memberIds: arrayUnion(user.uid),
      invitedEmails: arrayRemove(email),
      updatedAt: serverTimestamp(),
    });
    batch.set(memberRef, {
      uid: user.uid,
      displayName: user.displayName || email,
      email,
      photoURL: user.photoURL || null,
      joinedAt: serverTimestamp(),
    });
    await batch.commit();
  }
}

export function subscribeMyChecklists(uid, callback) {
  const q = query(
    collection(db, "checklists"),
    where("memberIds", "array-contains", uid),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(q, callback, (err) => console.error(err));
}

export async function createChecklist(user, title) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");

  const listRef = doc(collection(db, "checklists"));
  const batch = writeBatch(db);
  batch.set(listRef, {
    title: trimmed,
    createdBy: user.uid,
    memberIds: [user.uid],
    invitedEmails: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(listRef, "members", user.uid), {
    uid: user.uid,
    displayName: user.displayName || user.email,
    email: normalizeEmail(user.email || ""),
    photoURL: user.photoURL || null,
    joinedAt: serverTimestamp(),
  });
  await batch.commit();
  return listRef.id;
}

export function subscribeChecklist(listId, callback) {
  return onSnapshot(doc(db, "checklists", listId), callback);
}

export function subscribeMembers(listId, callback) {
  const q = query(
    collection(db, "checklists", listId, "members"),
    orderBy("joinedAt", "asc"),
  );
  return onSnapshot(q, callback);
}

export function subscribeItems(listId, callback) {
  const q = query(
    collection(db, "checklists", listId, "items"),
    orderBy("sortOrder", "asc"),
  );
  return onSnapshot(q, callback);
}

export async function addItem(listId, user, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "checklists", listId, "items"), {
    text: trimmed,
    addedBy: user.uid,
    sortOrder: Date.now(),
    createdAt: serverTimestamp(),
    completed: false,
    completedBy: null,
    completedByName: null,
    completedAt: null,
  });
  await updateDoc(doc(db, "checklists", listId), {
    updatedAt: serverTimestamp(),
  });
}

export async function toggleItemComplete(listId, item, user, completed) {
  const ref = doc(db, "checklists", listId, "items", item.id);
  if (completed) {
    await updateDoc(ref, {
      completed: true,
      completedBy: user.uid,
      completedByName: user.displayName || user.email,
      completedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      completed: false,
      completedBy: null,
      completedByName: null,
      completedAt: null,
    });
  }
  await updateDoc(doc(db, "checklists", listId), {
    updatedAt: serverTimestamp(),
  });
}

export async function inviteByEmail(listId, email) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) throw new Error("Enter a valid email");

  await updateDoc(doc(db, "checklists", listId), {
    invitedEmails: arrayUnion(normalized),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteChecklist(listId) {
  const listRef = doc(db, "checklists", listId);
  const itemsSnap = await getDocs(collection(listRef, "items"));
  const membersSnap = await getDocs(collection(listRef, "members"));

  let batch = writeBatch(db);
  let ops = 0;

  const flush = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = writeBatch(db);
    ops = 0;
  };

  for (const d of [...itemsSnap.docs, ...membersSnap.docs]) {
    batch.delete(d.ref);
    ops++;
    if (ops >= 400) await flush();
  }
  batch.delete(listRef);
  ops++;
  await batch.commit();
}

export async function getChecklistOnce(listId) {
  const snap = await getDoc(doc(db, "checklists", listId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
