# Session handoff — MyChecklist

**Use this file** when you (or Cursor) pick up the project again. For Firebase/GitHub setup steps, see [`firebase-github-setup.html`](./firebase-github-setup.html).

Last updated: 3 November 2026

---

## One-line resume

v1 app is live and configured (Firebase project `mychecklist-194ac`). **v1.1 redesign built locally (all 5 steps), not pushed. Before pushing: deploy `firestore.rules` (task edit rule) and test signed-in.** Invite flow with a second Google account is still untested.

---

## v1.1 UI redesign — to build (approved 3 Nov 2026)

The mockup is the spec. Open in a browser: `mockup/index.html` (sign-in), `mockup/home.html`, `mockup/checklist.html`.
New styles live in `mockup/css/polish.css` (loaded after `styles.css`); theme script in `mockup/js/theme.js`.
**All of it is now in `src/` (3 Nov 2026).** `polish.css` is fully merged into `src/styles/`; the mockup stays as reference.

Build order (one step at a time, `npm run build` + check after each):

1. ✅ **Popups** — done 3 Nov 2026 (`src/components/modal.js`, `popups.js`). New-checklist tasks are written in a second batch after the list (item rule uses `get()`, can't see the list in the same batch).
   - Invite modal: close on backdrop click, Escape, ✕ button; fade/scale in; autofocus email. Keep the share link (already built) + hint "Opens only for people you've invited above."
   - **Add tasks** popup: "+ Add tasks" button in your column header (and on mobile). Textarea, **one task per line**, blank lines skipped, live count ("Add 3 tasks"), Ctrl+Enter submits. Write with one batch.
   - **New checklist** popup on home: title + optional first tasks (one per line). Replaces `prompt()` in `src/main.js`.
2. ✅ **Home page** — progress uses Firestore count queries per list (`getListSummary` in `db.js`), refetched when the list's `updatedAt` changes; no stored counters.
   - "Shared with me" cards: owner avatar + name, "x / y done", progress bar. Store `createdByName` on list at create; for old lists, fall back to `members/{createdBy}` doc. (Progress needs item counts on the list doc — decide how to keep them updated.)
   - New user with no lists and no invites: single "Create your first checklist" empty state (replaces both sections). Show their email in the hint.
   - Hide a section when it has no lists.
3. ✅ **Task cards + edit/delete** — rule updated in `firestore.rules`; **not deployed yet**.
   - Each task is a card with a left stripe in the adder's colour; done = green card.
   - ✎ / 🗑 always visible, but **only for the task's creator and the list owner**. Others can only check/uncheck.
   - Edit inline (Enter save, Esc cancel). Delete → row fades, toast "Task deleted · Undo" ~5 s, then delete.
   - **Rules change needed** in `firestore.rules` items `update`: allow `text` change only if `resource.data.addedBy == request.auth.uid || isOwner(listId)`; keep check/uncheck open to members. Delete rule already matches. Deploy: `firebase deploy --only firestore:rules`.
4. ✅ **Skeleton loading + motion** — entry animations play once per page (`data-settled` on `#app`), so live re-renders don't replay them.
   - Home: skeleton list cards. Checklist: skeleton grid on desktop, **different mobile skeleton** (tab pills, add button bar, task cards) — mobile is the main use case.
   - Custom checkbox pop, strike-through sweep, card hover lift, staggered entry, new-row highlight, button press. Respect `prefers-reduced-motion`.
5. ✅ **Theme + sign-in look on every page**
   - Light/dark toggle (🌙/☀️) in the header of every page and top-right on sign-in; defaults to OS preference, saved in `localStorage`; applied in `<head>` before paint (no flash). Audit old hard-coded light colours in `styles.css`.
   - Sign-in hero: two-column layout, gradient headline "Tick things off, together.", animated inline SVG illustration (self-drawn, no licence), drifting blur blobs, feature chips.
   - Same look on all pages: drifting blobs behind `.app-shell`, frosted header, translucent cards, gradient primary buttons / icons / progress, gradient accent in "Your **checklists**".
   - Note: `color-mix()` / `backdrop-filter` need ~2023+ browsers (degrade to solid).

As each step lands, move its rules from `mockup/css/polish.css` into the matching file under `src/styles/` (no single big stylesheet any more). When done: update this file, then push `master`.

---

## Product summary

- **What:** Shared checklists for Google users.
- **Layout:** Each collaborator = **column**; each item they add = **new row** (one filled cell per row).
- **Rules:** Anyone on the list can check any item; UI shows **who completed** it. Only the **creator** deletes the whole list.
- **Stack:** Vite (vanilla JS) + Firebase Auth (Google) + Firestore + GitHub Pages.

---

## Current status

| Area | Status | Notes |
|------|--------|--------|
| UI mockup | Done (v1.1) | `mockup/` — new design, **not built yet** |
| v1.1 UI build | Done locally | Not pushed; rules deploy pending |
| v1 app | Done | `src/`, `index.html`, `src/styles/` |
| `firebase-config.js` | Done | Project `mychecklist-194ac` |
| Firestore database | Done | ID `(default)`, **Standard** edition, Native mode |
| Firestore rules (cloud) | Done | Deployed via `firebase deploy --only firestore:rules` |
| Firestore indexes | Done | Deployed from `firestore.indexes.json` |
| GitHub Actions deploy | Done | `.github/workflows/deploy-pages.yml` runs green |
| GitHub Pages source | Done | **GitHub Actions** (serves `dist/`) |
| Invite flow | **Not tested** | Needs a second Google account |

---

## Repo map

```
MyChecklist/
├── docs/                     ← maintainer docs (not deployed)
│   ├── session-handoff.md    ← this file
│   └── firebase-github-setup.html
├── mockup/                   ← v1.1 design spec
├── src/                      ← full breakdown + conventions in README.md
│   ├── main.js               ← entry, hash routing (#/, #/list/:id)
│   ├── config/firebase.js
│   ├── services/             ← auth.js (sign-in, claim invites), db.js
│   ├── components/           ← layout.js, modal.js, popups.js
│   ├── views/                ← signin, home, checklist
│   ├── utils/helpers.js
│   ├── styles/               ← index.css → base/ layout/ components/ pages/
│   └── assets/images/
├── firebase-config.js
├── firestore.rules
├── firestore.indexes.json
├── vite.config.js            ← base: "/MyChecklist/"
└── .github/workflows/deploy-pages.yml
```

---

## Firestore data model

**`checklists/{listId}`**

- `title`, `createdBy`, `memberIds[]`, `invitedEmails[]` (lowercase)
- `createdAt`, `updatedAt`

**`checklists/{listId}/members/{uid}`**

- `uid`, `displayName`, `email`, `photoURL`, `joinedAt`

**`checklists/{listId}/items/{itemId}`**

- `text`, `addedBy`, `sortOrder`, `createdAt`
- `completed`, `completedBy`, `completedByName`, `completedAt`

**Invite flow:** Owner adds email to `invitedEmails` → invitee signs in → `claimPendingInvites()` in `auth.js` adds uid to `memberIds`, creates member doc, removes email from `invitedEmails`.

---

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://sayan216016.github.io/MyChecklist/#/` |
| List | `https://sayan216016.github.io/MyChecklist/#/list/{listId}` |
| Local | `npm run dev` → usually `http://localhost:5173/MyChecklist/#/` |

---

## Commands

```powershell
cd "c:\Users\Mukhersa\MyChecklist - 3rdNOV\MyChecklist"
npm install
npm run dev
npm run build
git push origin master
```

Optional Firestore CLI:

```powershell
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore
```

---

## Config short checklist

See full steps in `firebase-github-setup.html`.

- [x] `firebase-config.js` filled in
- [x] Google sign-in enabled
- [x] Authorized domain `sayan216016.github.io`
- [x] `firestore.rules` published (+ indexes)
- [x] GitHub Pages = GitHub Actions
- [x] Push `master`, workflow green
- [x] Test sign-in → create list
- [ ] Test invite → second account

---

## Suggested next work

1. **Build the v1.1 UI redesign** (section above), steps 1 → 5.
2. Test the invite flow with a second Google account.
3. Ignore or remove unrelated `.sf/` Salesforce metadata if not needed.

---

## Decisions (don’t re-litigate unless changing product)

- Google-only auth for v1.
- Invite email (lowercase) must match Google account email.
- Real-time via Firestore `onSnapshot`.
- Mobile: column tabs; desktop: full grid.
- Repo: `Sayan216016/MyChecklist`, branch `master`.
- Task edit/delete: only the task's creator or the list owner; everyone else can only check/uncheck.
- Tasks are cards (not table cells); actions always visible to those allowed (no hover-only).
- Mobile-first: every loading/skeleton state needs a mobile shape.
- Images: inline SVG drawn in-project (no stock assets).
- Firestore rules: list reads check `resource.data.memberIds` (not `get()`) so queries pass; the creator's own member doc is allowed via `getAfter()` in the create batch; members may update only `updatedAt` on the list doc.

---

## For AI assistants (Cursor)

When the user says “continue MyChecklist”:

1. Read `docs/session-handoff.md`, `README.md` (structure + conventions) and `docs/firebase-github-setup.html`. For UI work, open the `mockup/` pages and `mockup/css/polish.css` — they are the spec.
2. Check `firebase-config.js` for placeholders.
3. Run `npm run build` after frontend changes.
4. Do not commit/push unless the user asks; never force-push `master`.
