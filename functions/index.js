const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const APP_BASE = "https://sayan216016.github.io/MyChecklist";
const OG_IMAGE = `${APP_BASE}/og-image.jpg`;
const SHARE_BASE = "https://us-central1-mychecklist-194ac.cloudfunctions.net/share";

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

exports.share = onRequest({ region: "us-central1" }, async (req, res) => {
  const listId = String(req.query.list || "").trim();
  const appUrl = listId ? `${APP_BASE}/#/list/${encodeURIComponent(listId)}` : `${APP_BASE}/#/`;
  const shareUrl = listId ? `${SHARE_BASE}?list=${encodeURIComponent(listId)}` : SHARE_BASE;

  let title = "MyChecklist — shared checklists";
  let description =
    "Make checklists, invite people by Gmail, and tick things off together. Free with Google sign-in.";

  if (listId) {
    title = "Shared checklist · MyChecklist";
    description = "Sign in with an invited Gmail to open this list.";
    try {
      const snap = await getFirestore().doc(`checklists/${listId}`).get();
      if (snap.exists) {
        const listTitle = String(snap.data().title || "Checklist").trim() || "Checklist";
        title = `${listTitle} · MyChecklist`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MyChecklist" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:url" content="${esc(shareUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <meta http-equiv="refresh" content="0;url=${esc(appUrl)}" />
  <link rel="canonical" href="${esc(appUrl)}" />
</head>
<body><p><a href="${esc(appUrl)}">Open MyChecklist</a></p></body>
</html>`;

  res.set("Cache-Control", "public, max-age=300");
  res.set("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
});
