# Session handoff — MyChecklist

**Use this file** when you (or Cursor) pick up the project again. Code structure and conventions are in the root [`README.md`](../README.md). Firebase/GitHub setup steps: [`firebase-github-setup.html`](./firebase-github-setup.html).

Last updated: 3 November 2026

---

## One-line resume

v1.1 redesign is built and live on GitHub Pages (Firebase project `mychecklist-194ac`). Invites work with a second Google account. **Latest header + "← Dashboard" changes are local only — push `master` to ship them.** Open item: confirm task edit works for a collaborator (see "Open issues").

---

## What's built (v1.1, 3 Nov 2026)

The `mockup/` pages were the spec; everything from `mockup/css/polish.css` is merged into `src/styles/`. The mockup is now reference only.

- **Popups** (`components/modal.js`, `popups.js`): New checklist (title + first tasks, one per line), Add tasks (one per line, live count, Ctrl+Enter), Invite (email only). Close on backdrop / Esc / ✕. Mounted outside `#app` so live re-renders don't wipe typing.
- **Home:** gradient title; cards show "x / y done" + progress, shared cards show owner avatar + name; first-run empty state (only the middle "+ New checklist" button — the top-right one shows only when the user has lists); empty sections hidden; skeleton cards while loading.
- **Checklist:** "‹ Dashboard" pill button above the title (`.back-btn`, secondary button + SVG chevron); task cards with a stripe in the adder's colour, green when done; ✎/🗑 only for the task's creator or the list owner; inline edit (Enter/Esc); delete with 5 s Undo toast; header progress bar; new-row highlight; desktop grid + mobile tabs, separate mobile skeleton.
- **Header (all pages):** brand · 🌙/☀️ toggle · user pill (avatar, name, Sign out). On ≤768 px the name hides so the bar has room.
- **Theme:** light/dark, defaults to OS, saved in `localStorage`, set in `index.html` `<head>` before paint.
- **Motion:** checkbox pop, strike sweep, hover lift, staggered entry. Plays once per page (`data-settled` on `#app`); respects `prefers-reduced-motion`.

### Implementation notes

- New-checklist first tasks are a **second write** after the list: the item rule checks membership with `get()`, which can't see a list created in the same batch.
- Home progress uses Firestore **count queries** per list (`getListSummary` in `db.js`), refetched when that list's `updatedAt` changes. No stored counters, so old lists work.
- `createdByName` is stored on new lists; older lists fall back to the owner's `members/{uid}` doc.
- **Share link:** Invite popup includes a **preview link** (`shareListUrl` → Cloud Function) for WhatsApp/OG crawlers; email invite still required to access the list. Hash `#/list/…` links do not carry checklist title to chat apps.

---

## Open issues / next steps

1. **Task edit by a collaborator** reported "insufficient permissions" once. The edit rule in `firestore.rules` is deployed (CLI said "already up to date"), so retest; if it still fails, capture the console error and check the items `update` rule.
2. Push the latest local changes (header pill, "← Dashboard").
3. Nice-to-have, not built: member avatars on home cards (mockup shows them; needs member data per list); Undo for more than the last of several quick deletes; >500-line paste in Add tasks (one batch limit).
4. Ignore or remove unrelated `.sf/` Salesforce metadata.

---

## Product summary

- **What:** Shared checklists for Google users.
- **Layout:** Each collaborator = **column**; each task they add = **new row**.
- **Rules:** Anyone on the list can tick any task; UI shows **who completed** it. Only the **creator** deletes the whole list. Task text edit/delete: task's creator or list owner.
- **Stack:** Vite (vanilla JS) + Firebase Auth (Google) + Firestore + GitHub Pages.

---

## Current status

| Area | Status | Notes |
|------|--------|--------|
| v1.1 UI | Live | Latest header/back-link tweak not pushed yet |
| `firebase-config.js` | Done | Project `mychecklist-194ac` |
| Firestore database | Done | ID `(default)`, Standard edition, Native mode |
| Firestore rules | Deployed | Includes task-text edit rule |
| Firestore indexes | Done | `firestore.indexes.json` |
| GitHub Actions deploy | Done | `.github/workflows/deploy-pages.yml` |
| Invite flow | Works | Tested with a second Google account |

---

## Repo map

```
MyChecklist/
├── docs/                     ← maintainer docs (not deployed)
│   ├── session-handoff.md    ← this file
│   └── firebase-github-setup.html
├── mockup/                   ← v1.1 design spec (reference only)
├── src/                      ← full breakdown + conventions in README.md
│   ├── main.js               ← entry, hash routing (#/, #/list/:id), event wiring
│   ├── config/firebase.js
│   ├── services/             ← auth.js (sign-in, claim invites), db.js (all Firestore I/O)
│   ├── components/           ← layout.js (header), modal.js, popups.js, skeletons.js
│   ├── views/                ← signin, home, checklist (return HTML strings)
│   ├── utils/                ← helpers.js, theme.js
│   ├── styles/               ← index.css → base/ layout/ components/ pages/
│   └── assets/images/        ← hero-checklist.svg (inlined via ?raw)
├── index.html                ← #app, #toast, inline theme script
├── firebase-config.js
├── firestore.rules
├── firestore.indexes.json
├── vite.config.js            ← base: "/MyChecklist/"
└── .github/workflows/deploy-pages.yml
```

---

## Firestore data model

**`checklists/{listId}`**

- `title`, `createdBy`, `createdByName` (new lists), `memberIds[]`, `invitedEmails[]` (lowercase)
- `createdAt`, `updatedAt`

**`checklists/{listId}/members/{uid}`**

- `uid`, `displayName`, `email`, `photoURL`, `joinedAt`

**`checklists/{listId}/items/{itemId}`**

- `text`, `addedBy`, `sortOrder`, `createdAt`
- `completed`, `completedBy`, `completedByName`, `completedAt`

**Invite flow:** Owner adds email to `invitedEmails` → invitee signs in → `claimPendingInvites()` (`services/db.js`, called from `auth.js`) adds uid to `memberIds`, creates member doc, removes email from `invitedEmails`.

---

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://sayan216016.github.io/MyChecklist/#/` |
| List | `https://sayan216016.github.io/MyChecklist/#/list/{listId}` (members only) |
| Local | `npm run dev` → usually `http://localhost:5173/MyChecklist/#/` |

---

## Commands

```powershell
cd "c:\Users\Mukhersa\MyChecklist - 3rdNOV\MyChecklist"
npm install
npm run dev
npm run build
git push origin master
firebase deploy --only firestore:rules --project mychecklist-194ac
firebase deploy --only functions --project mychecklist-194ac
```

Functions need Blaze billing; they serve Open Graph HTML for share links. Site OG image: `public/og-image.jpg`.

---

## Decisions (don’t re-litigate unless changing product)

- Google-only auth.
- Invite by email only (lowercase, must match Google account). Preview link for chat apps; access still invite-gated.
- Real-time via Firestore `onSnapshot`; views re-render `#app` from state.
- Mobile: column tabs; desktop: full grid. Mobile-first: every loading state needs a mobile shape.
- Task edit/delete: only the task's creator or the list owner; everyone else can only check/uncheck.
- Tasks are cards; actions always visible to those allowed (no hover-only).
- Images: SVG drawn in-project (no stock assets).
- Styles: one file per concern under `src/styles/`, colours via tokens in `base/tokens.css` (dark overrides in `base/theme-dark.css`).
- Firestore rules: list reads check `resource.data.memberIds` (not `get()`) so queries pass; the creator's own member doc is allowed via `getAfter()` in the create batch; members may update only `updatedAt` on the list doc.
- Repo: `Sayan216016/MyChecklist`, branch `master`.

---

## For AI assistants (Cursor)

When the user says “continue MyChecklist”:

1. Read this file and `README.md` (structure + conventions). `mockup/` is design reference.
2. Put code where the README conventions say (services / components / views / utils / styles).
3. Run `npm run build` after frontend changes; check mobile (390 px) and desktop.
4. Rule changes need `firebase deploy --only firestore:rules`.
5. Do not commit/push unless the user asks; never force-push `master`.
