# MyChecklist

Shared collaborative checklists — Google sign-in, Firebase Firestore, hosted on GitHub Pages.

**Internal docs (repo only):** [`internal/session-handoff.md`](internal/session-handoff.md) · [`internal/firebase-github-setup.html`](internal/firebase-github-setup.html)

## Local development

1. Copy `firebase-config.example.js` values into `firebase-config.js` (or edit `firebase-config.js` directly).
2. `npm install`
3. `npm run dev` — open the URL Vite prints (use `#/` routes).

## Deploy

Push to `master`; GitHub Actions builds and deploys to Pages.

Site URL: `https://sayan216016.github.io/MyChecklist/`

Static mockup (reference only): `/mockup/`.
