# Session handoff — MyChecklist

**Use this file** when you (or Cursor) pick up the project again. For Firebase/GitHub setup steps, see [`firebase-github-setup.html`](./firebase-github-setup.html).

Last updated: 3 November 2026

---

## One-line resume

v1 app is live and configured (Firebase project `mychecklist-194ac`); sign-in and list creation work on the live URL. Next: test invites with a second Google account.

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
| UI mockup | Done | `mockup/` — static reference only |
| v1 app | Done | `src/`, `index.html`, `public/css/styles.css` |
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
├── internal/                 ← internal docs (not deployed)
│   ├── session-handoff.md    ← this file
│   └── firebase-github-setup.html
├── mockup/
├── src/
│   ├── main.js               ← hash routing (#/, #/list/:id)
│   ├── firebase.js
│   ├── auth.js               ← Google sign-in, claim invites
│   ├── db.js
│   └── views/
├── public/css/styles.css
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

1. Test the invite flow with a second Google account.
2. Owner name on “Shared with me” cards.
3. UI to edit/delete single items (rules partially there).
4. Invite modal: backdrop / Escape to close.
5. Ignore or remove unrelated `.sf/` Salesforce metadata if not needed.

---

## Decisions (don’t re-litigate unless changing product)

- Google-only auth for v1.
- Invite email (lowercase) must match Google account email.
- Real-time via Firestore `onSnapshot`.
- Mobile: column tabs; desktop: full grid.
- Repo: `Sayan216016/MyChecklist`, branch `master`.
- Firestore rules: list reads check `resource.data.memberIds` (not `get()`) so queries pass; the creator's own member doc is allowed via `getAfter()` in the create batch; members may update only `updatedAt` on the list doc.

---

## For AI assistants (Cursor)

When the user says “continue MyChecklist”:

1. Read `internal/session-handoff.md` and `internal/firebase-github-setup.html`.
2. Check `firebase-config.js` for placeholders.
3. Run `npm run build` after frontend changes.
4. Do not commit/push unless the user asks; never force-push `master`.
