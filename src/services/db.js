import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getCountFromServer,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase.js";
import { normalizeEmail } from "../utils/helpers.js";

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
    createdByName: user.displayName || user.email,
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

/** Adds several tasks (already trimmed, non-empty) in one batch, keeping their order. */
export async function addItems(listId, user, texts) {
  if (!texts.length) return;
  const listRef = doc(db, "checklists", listId);
  const batch = writeBatch(db);
  const now = Date.now();
  texts.forEach((text, i) => {
    batch.set(doc(collection(listRef, "items")), {
      text,
      addedBy: user.uid,
      sortOrder: now + i,
      createdAt: serverTimestamp(),
      completed: false,
      completedBy: null,
      completedByName: null,
      completedAt: null,
    });
  });
  batch.update(listRef, { updatedAt: serverTimestamp() });
  await batch.commit();
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

/** Allowed by rules only for the task's creator or the list owner. */
export async function updateItemText(listId, itemId, text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Task can't be empty");
  await updateDoc(doc(db, "checklists", listId, "items", itemId), { text: trimmed });
}

export async function deleteItem(listId, itemId) {
  await deleteDoc(doc(db, "checklists", listId, "items", itemId));
}

/**
 * Home-card details: owner name/photo and "done / total" counts.
 * Counts use aggregation queries (1 read per 1000 items), so old lists need no stored counters.
 */
export async function getListSummary(list) {
  const items = collection(db, "checklists", list.id, "items");
  const [total, done, owner] = await Promise.all([
    getCountFromServer(items),
    getCountFromServer(query(items, where("completed", "==", true))),
    list.createdByName ? null : getDoc(doc(db, "checklists", list.id, "members", list.createdBy)),
  ]);
  const ownerData = owner?.data();
  return {
    total: total.data().count,
    done: done.data().count,
    owner: {
      uid: list.createdBy,
      displayName: list.createdByName || ownerData?.displayName || "Owner",
      email: ownerData?.email || "",
      photoURL: ownerData?.photoURL || null,
    },
  };
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
