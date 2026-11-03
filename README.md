# MyChecklist

Shared, real-time checklists for Google users. Each collaborator gets a **column**; every task they add becomes a new **row**. Anyone on the list can tick any task, and the app shows who completed it.

- **Live:** https://sayan216016.github.io/MyChecklist/
- **Stack:** Vite (vanilla JS, no framework) · Firebase Auth (Google) · Cloud Firestore · GitHub Pages

---

## Quick start

```powershell
npm install
npm run dev      # http://localhost:5173/MyChecklist/#/
npm run build    # production build into dist/
npm run preview  # serve dist/ locally
```

Firebase config lives in `firebase-config.js` (template: `firebase-config.example.js`). The web config is public by design; access is controlled by `firestore.rules`.

---

## Project structure

```
MyChecklist/
├── index.html                  App shell: #app mount point + #toast
├── firebase-config.js          Firebase web app config (public keys)
├── firestore.rules             Security rules  → firebase deploy --only firestore:rules
├── firestore.indexes.json      Composite indexes
├── vite.config.js              base: "/MyChecklist/" for GitHub Pages
│
├── src/
│   ├── main.js                 Entry: hash router, auth gate, binds view events
│   ├── config/
│   │   └── firebase.js         Initialises Firebase app, auth, db
│   ├── services/               All I/O. Views never call Firebase directly.
│   │   ├── auth.js             Google sign-in/out, claims pending invites
│   │   └── db.js               Firestore reads/writes for lists, members, items
│   ├── components/             Reusable UI pieces
│   │   ├── layout.js           App header, avatars
│   │   ├── modal.js            Generic popup (backdrop/Esc/✕ close, focus)
│   │   ├── popups.js           New checklist, Add tasks, Invite popups
│   │   └── skeletons.js        Loading placeholders (home; checklist desktop + mobile)
│   ├── views/                  One file per page; each returns an HTML string
│   │   ├── signin.js
│   │   ├── home.js
│   │   └── checklist.js
│   ├── utils/
│   │   ├── helpers.js          escapeHtml, toast (+ Undo action), dates, parseLines, member colours
│   │   └── theme.js            🌙/☀️ toggle (initial theme is set inline in index.html <head>)
│   ├── styles/                 CSS, imported once via styles/index.css
│   │   ├── index.css           Import order: base → layout → components → pages
│   │   ├── base/               tokens.css (light colours, radii, shadows, font, gradients),
│   │   │                       theme-dark.css, reset.css, typography.css, motion.css (keyframes, reduced motion)
│   │   ├── layout/             app-shell.css (frosted header, background blobs), responsive.css
│   │   ├── components/         buttons, avatar, theme-toggle, modal (+ form fields), toast,
│   │   │                       progress, skeleton, empty-state, item-card (task card + checkbox)
│   │   └── pages/              signin (hero + illustration), home, checklist
│   └── assets/
│       └── images/             Self-drawn SVGs, imported with ?raw so they inherit theme colours
│
├── mockup/                     Static design spec for v1.1 (not deployed)
├── docs/                       Maintainer docs (not deployed)
│   ├── session-handoff.md      Current status, roadmap, decisions — start here
│   └── firebase-github-setup.html
└── .github/workflows/deploy-pages.yml   Build + deploy on push to master
```

### Conventions

- **Where does new code go?** Firebase calls → `services/`. Something used on more than one page → `components/`. A whole page → `views/`. Pure helpers → `utils/`.
- **Styling:** use the CSS variables in `styles/base/tokens.css`; don't hard-code colours. New component → new file in `styles/components/` and one `@import` line in `styles/index.css`.
- **Rendering:** views return HTML strings; `main.js` mounts them into `#app` and binds `data-action` handlers. Always pass user text through `escapeHtml`.
- **Popups** mount on `<body>`, outside `#app`, so live Firestore re-renders don't wipe what the user is typing.

---

## Data model (Firestore)

| Path | Fields |
|------|--------|
| `checklists/{listId}` | `title`, `createdBy`, `memberIds[]`, `invitedEmails[]` (lowercase), `createdAt`, `updatedAt` |
| `checklists/{listId}/members/{uid}` | `uid`, `displayName`, `email`, `photoURL`, `joinedAt` |
| `checklists/{listId}/items/{itemId}` | `text`, `addedBy`, `sortOrder`, `createdAt`, `completed`, `completedBy`, `completedByName`, `completedAt` |

**Invites:** the owner adds an email to `invitedEmails`; when that person signs in, `claimPendingInvites()` adds them to `memberIds` and creates their member doc.

---

## Deploy

- **App:** push to `master` → GitHub Actions builds and publishes `dist/` to Pages.
- **Rules / indexes:** `firebase deploy --only firestore` (not part of CI).

More detail, status and roadmap: [`docs/session-handoff.md`](docs/session-handoff.md) · setup guide: [`docs/firebase-github-setup.html`](docs/firebase-github-setup.html)
