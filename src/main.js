/**
 * App entry: hash router (#/ home, #/list/:id checklist), auth gate, and event wiring.
 * Views in ./views return HTML strings; this file mounts them and binds their events.
 */
import "./styles/index.css";
import { configMissing } from "./config/firebase.js";
import { watchAuth, signInWithGoogle, signOutUser } from "./services/auth.js";
import {
  subscribeMyChecklists,
  createChecklist,
  subscribeChecklist,
  subscribeMembers,
  subscribeItems,
  addItems,
  updateItemText,
  deleteItem,
  getListSummary,
  toggleItemComplete,
  inviteByEmail,
  deleteChecklist,
  getChecklistOnce,
} from "./services/db.js";
import { renderSignIn } from "./views/signin.js";
import { renderHome } from "./views/home.js";
import { renderChecklist } from "./views/checklist.js";
import { renderHeader } from "./components/layout.js";
import { checklistSkeleton } from "./components/skeletons.js";
import { closeModal } from "./components/modal.js";
import {
  openNewChecklistPopup,
  openAddTasksPopup,
  openInvitePopup,
  openDeleteChecklistPopup,
} from "./components/popups.js";
import { showToast } from "./utils/helpers.js";
import { initThemeToggle } from "./utils/theme.js";
const appEl = document.getElementById("app");

let currentUser = null;
let unsubRoute = null;
let signInLoading = false;
let signInError = "";

function parseRoute() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const listMatch = hash.match(/^\/list\/([^/]+)/);
  if (listMatch) return { name: "list", id: listMatch[1] };
  if (hash === "/" || hash === "") return { name: "home" };
  return { name: "home" };
}

function navigate(path) {
  location.hash = path;
}

function setApp(html) {
  appEl.innerHTML = html;
}

let settleTimer = null;
/** After a page's first real render has animated in, stop replaying entry animations on live re-renders. */
function settle() {
  if (appEl.dataset.settled || settleTimer) return;
  settleTimer = setTimeout(() => (appEl.dataset.settled = "1"), 600);
}

function unsettle() {
  clearTimeout(settleTimer);
  settleTimer = null;
  delete appEl.dataset.settled;
}

function bindSignOut(root) {
  root.querySelector("[data-action=sign-out]")?.addEventListener("click", () => {
    signOutUser().catch((e) => showToast(e.message, true));
  });
}

function renderSignInView() {
  setApp(renderSignIn({ configMissing, loading: signInLoading, error: signInError }));
  appEl.querySelector("[data-action=google-sign-in]")?.addEventListener("click", async () => {
    signInLoading = true;
    signInError = "";
    renderSignInView();
    try {
      await signInWithGoogle();
    } catch (e) {
      signInError = e.message || "Sign-in failed";
    } finally {
      signInLoading = false;
      renderSignInView();
    }
  });
}

function mountHome(user) {
  let lists = null;
  let alive = true;
  // listId → { key: updatedAt millis, data }; refetched only when that list changes
  const summaries = new Map();

  const loadSummaries = () => {
    for (const list of lists) {
      const key = list.updatedAt?.toMillis?.() ?? 0;
      if (summaries.get(list.id)?.key === key) continue;
      summaries.set(list.id, { key, data: summaries.get(list.id)?.data });
      getListSummary(list)
        .then((data) => {
          if (!alive || summaries.get(list.id)?.key !== key) return;
          summaries.set(list.id, { key, data });
          render();
        })
        .catch((e) => console.error(e));
    }
  };

  const render = () => {
    const rows = (lists || []).map((list) => ({ list, summary: summaries.get(list.id)?.data }));
    const created = rows.filter((r) => r.list.createdBy === user.uid);
    const shared = rows.filter((r) => r.list.createdBy !== user.uid);

    setApp(renderHome(user, { created, shared, loading: !lists }));
    if (lists) settle();
    bindSignOut(appEl);

    appEl.querySelector("[data-action=new-list]")?.addEventListener("click", () => {
      openNewChecklistPopup(async (title, tasks) => {
        const id = await createChecklist(user, title);
        // second write: item rules check membership via get(), which can't see the list in the same batch
        try {
          await addItems(id, user, tasks);
        } catch (e) {
          showToast(`List created, but tasks weren't added: ${e.message}`, true);
        }
        navigate(`/list/${id}`);
      });
    });
  };

  render();
  const unsub = subscribeMyChecklists(user.uid, (snap) => {
    lists = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
    loadSummaries();
  });
  unsubRoute = () => {
    alive = false;
    unsub();
  };
}

function mountList(user, listId) {
  let list = null;
  let members = [];
  let items = null;
  let mobileMemberUid = user.uid;
  let accessDenied = false;
  let editingId = null;
  let editDraft = "";
  let poppedId = null;
  let freshIds = new Set();
  const leavingIds = new Set();
  const pendingDeletes = new Map(); // itemId → timer; delete is committed after the Undo window

  const cleanup = [];

  const commitDelete = (itemId) => {
    clearTimeout(pendingDeletes.get(itemId));
    pendingDeletes.delete(itemId);
    deleteItem(listId, itemId).catch((e) => {
      leavingIds.delete(itemId);
      showToast(e.message, true);
      rerender();
    });
  };

  const startDelete = (itemId) => {
    leavingIds.add(itemId);
    pendingDeletes.set(itemId, setTimeout(() => commitDelete(itemId), 5000));
    rerender();
    showToast("Task deleted", false, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(pendingDeletes.get(itemId));
          pendingDeletes.delete(itemId);
          leavingIds.delete(itemId);
          rerender();
        },
      },
    });
  };

  const saveEdit = async () => {
    const item = items.find((i) => i.id === editingId);
    const text = editDraft.trim();
    editingId = null;
    rerender();
    if (!item || !text || text === item.text) return;
    try {
      await updateItemText(listId, item.id, text);
    } catch (e) {
      showToast(e.message, true);
    }
  };

  const rerender = () => {
    if (accessDenied) {
      setApp(`
        <div class="app-shell">
          <main class="app-main">
            <h1 class="page-title">No access</h1>
            <p class="page-subtitle">You’re not on this checklist. Ask the owner to invite your Gmail.</p>
            <a class="btn btn--primary" href="#/" data-link>Back home</a>
          </main>
        </div>`);
      return;
    }
    if (!list || !items || !members.length) {
      setApp(`
        <div class="app-shell">
          ${renderHeader(user)}
          <main class="app-main app-main--wide">${checklistSkeleton()}</main>
        </div>`);
      bindSignOut(appEl);
      return;
    }

    setApp(
      renderChecklist(user, list, members, items, {
        mobileMemberUid,
        editingId,
        editDraft,
        poppedId,
        leavingIds,
        freshIds,
      }),
    );
    settle();
    bindSignOut(appEl);
    bindListEvents();

    // live re-renders replace the edit box; keep focus in the visible one (mobile or desktop)
    const editInput = [...appEl.querySelectorAll("[data-edit-input]")].find((el) => el.offsetParent);
    if (editInput) {
      editInput.focus();
      editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    }
  };

  const bindListEvents = () => {
    appEl.querySelectorAll("[data-mobile-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mobileMemberUid = btn.getAttribute("data-mobile-tab");
        rerender();
      });
    });

    appEl.querySelectorAll("[data-item-id]").forEach((input) => {
      input.addEventListener("change", async () => {
        const item = items.find((i) => i.id === input.getAttribute("data-item-id"));
        if (!item) return;
        poppedId = input.checked ? item.id : null;
        setTimeout(() => (poppedId = null), 400);
        try {
          await toggleItemComplete(listId, item, user, input.checked);
        } catch (e) {
          showToast(e.message, true);
          input.checked = !input.checked;
        }
      });
    });

    appEl.querySelectorAll("[data-edit-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = items.find((i) => i.id === btn.getAttribute("data-edit-item"));
        if (!item) return;
        editingId = item.id;
        editDraft = item.text;
        rerender();
      });
    });

    appEl.querySelectorAll("[data-edit-input]").forEach((input) => {
      input.addEventListener("input", () => (editDraft = input.value));
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveEdit();
        if (e.key === "Escape") {
          editingId = null;
          rerender();
        }
      });
    });

    appEl.querySelectorAll("[data-delete-item]").forEach((btn) => {
      btn.addEventListener("click", () => startDelete(btn.getAttribute("data-delete-item")));
    });

    appEl.querySelectorAll("[data-action=add-tasks]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openAddTasksPopup((tasks) => addItems(listId, user, tasks));
      });
    });

    appEl.querySelector("[data-action=open-invite]")?.addEventListener("click", () => {
      openInvitePopup(async (email) => {
        await inviteByEmail(listId, email);
        showToast("Invite sent");
      });
    });
    appEl.querySelector("[data-action=delete-list]")?.addEventListener("click", () => {
      openDeleteChecklistPopup(async () => {
        await deleteChecklist(listId);
        showToast("List deleted");
        navigate("/");
      });
    });
  };

  cleanup.push(
    subscribeChecklist(listId, (snap) => {
      if (!snap.exists()) {
        accessDenied = true;
        list = null;
        rerender();
        return;
      }
      list = { id: snap.id, ...snap.data() };
      if (!list.memberIds?.includes(user.uid)) {
        accessDenied = true;
        rerender();
        return;
      }
      accessDenied = false;
      rerender();
    }),
  );

  cleanup.push(
    subscribeMembers(listId, (snap) => {
      members = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rerender();
    }),
  );

  cleanup.push(
    subscribeItems(listId, (snap) => {
      const firstLoad = !items;
      const known = new Set((items || []).map((i) => i.id));
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      freshIds = firstLoad ? new Set() : new Set(items.filter((i) => !known.has(i.id)).map((i) => i.id));
      rerender();
      if (freshIds.size) setTimeout(() => (freshIds = new Set()), 1200);
    }),
  );

  getChecklistOnce(listId).then((data) => {
    if (!data) accessDenied = true;
    else if (!data.memberIds?.includes(user.uid)) accessDenied = true;
    rerender();
  });

  rerender();
  unsubRoute = () => {
    cleanup.forEach((fn) => fn());
    // leaving the page ends the Undo window
    [...pendingDeletes.keys()].forEach(commitDelete);
  };
}

function route() {
  closeModal();
  unsettle();
  if (unsubRoute) {
    unsubRoute();
    unsubRoute = null;
  }

  if (configMissing) {
    renderSignInView();
    return;
  }

  if (!currentUser) {
    renderSignInView();
    return;
  }

  const r = parseRoute();
  if (r.name === "list") mountList(currentUser, r.id);
  else mountHome(currentUser);
}

window.addEventListener("hashchange", route);
initThemeToggle();

watchAuth((user) => {
  currentUser = user;
  route();
});

route();
