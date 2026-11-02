import { configMissing } from "./firebase.js";
import { watchAuth, signInWithGoogle, signOutUser } from "./auth.js";
import {
  subscribeMyChecklists,
  createChecklist,
  subscribeChecklist,
  subscribeMembers,
  subscribeItems,
  addItem,
  toggleItemComplete,
  inviteByEmail,
  deleteChecklist,
  getChecklistOnce,
} from "./db.js";
import { renderSignIn } from "./views/signin.js";
import { renderHome } from "./views/home.js";
import { renderChecklist } from "./views/checklist.js";
import { showToast } from "./util.js";

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
  let lists = [];

  const render = () => {
    const created = lists
      .filter((l) => l.createdBy === user.uid)
      .map((list) => ({ list }));
    const shared = lists
      .filter((l) => l.createdBy !== user.uid)
      .map((list) => ({ list }));

    setApp(renderHome(user, { created, shared, loading: false }));
    bindSignOut(appEl);

    appEl.querySelector("[data-action=new-list]")?.addEventListener("click", async () => {
      const title = prompt("Checklist title");
      if (!title?.trim()) return;
      try {
        const id = await createChecklist(user, title);
        navigate(`/list/${id}`);
      } catch (e) {
        showToast(e.message, true);
      }
    });
  };

  unsubRoute = subscribeMyChecklists(user.uid, (snap) => {
    lists = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  });
}

function mountList(user, listId) {
  let list = null;
  let members = [];
  let items = [];
  let mobileMemberUid = user.uid;
  let inviteOpen = false;
  let accessDenied = false;

  const shareUrl = `${location.origin}${location.pathname}#/list/${listId}`;

  const cleanup = [];

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
    if (!list) {
      setApp(`<main class="app-main"><p class="page-subtitle">Loading…</p></main>`);
      return;
    }

    setApp(
      renderChecklist(user, list, members, items, {
        mobileMemberUid,
        shareUrl,
        inviteOpen,
      }),
    );
    bindSignOut(appEl);
    bindListEvents();
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
        try {
          await toggleItemComplete(listId, item, user, input.checked);
        } catch (e) {
          showToast(e.message, true);
          input.checked = !input.checked;
        }
      });
    });

    appEl.querySelectorAll("[data-action=add-item]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-member");
        const input = appEl.querySelector(`[data-add-input="${uid}"]`);
        if (!input?.value.trim()) return;
        try {
          await addItem(listId, user, input.value);
          input.value = "";
        } catch (e) {
          showToast(e.message, true);
        }
      });
    });

    appEl.querySelector("[data-action=add-item-mobile]")?.addEventListener("click", async () => {
      const input = appEl.querySelector("[data-mobile-add-input]");
      if (!input?.value.trim()) return;
      try {
        await addItem(listId, user, input.value);
        input.value = "";
      } catch (e) {
        showToast(e.message, true);
      }
    });

    appEl.querySelector("[data-action=open-invite]")?.addEventListener("click", () => {
      inviteOpen = true;
      rerender();
    });
    appEl.querySelector("[data-action=close-invite]")?.addEventListener("click", () => {
      inviteOpen = false;
      rerender();
    });
    appEl.querySelector("[data-action=send-invite]")?.addEventListener("click", async () => {
      const email = appEl.querySelector("[data-invite-email]")?.value;
      try {
        await inviteByEmail(listId, email);
        showToast("Invite sent");
        inviteOpen = false;
        rerender();
      } catch (e) {
        showToast(e.message, true);
      }
    });
    appEl.querySelector("[data-action=copy-link]")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied");
      } catch {
        showToast("Could not copy link", true);
      }
    });
    appEl.querySelector("[data-action=delete-list]")?.addEventListener("click", async () => {
      if (!confirm("Delete this entire checklist? This cannot be undone.")) return;
      try {
        await deleteChecklist(listId);
        showToast("List deleted");
        navigate("/");
      } catch (e) {
        showToast(e.message, true);
      }
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
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rerender();
    }),
  );

  getChecklistOnce(listId).then((data) => {
    if (!data) accessDenied = true;
    else if (!data.memberIds?.includes(user.uid)) accessDenied = true;
    rerender();
  });

  unsubRoute = () => cleanup.forEach((fn) => fn());
}

function route() {
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

watchAuth((user) => {
  currentUser = user;
  route();
});

route();
