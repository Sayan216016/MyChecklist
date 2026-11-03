/** Production URLs (GitHub Pages). Used for share links and Open Graph image paths. */
export const APP_ORIGIN = "https://sayan216016.github.io";
export const APP_BASE = `${APP_ORIGIN}/MyChecklist`;
export const OG_IMAGE = `${APP_BASE}/og-image.jpg`;

/** After `firebase deploy --only functions`, crawlers use this for rich list previews. */
export const SHARE_PREVIEW_BASE =
  "https://us-central1-mychecklist-194ac.cloudfunctions.net/share";

export function appListUrl(listId) {
  return `${APP_BASE}/#/list/${listId}`;
}

/** Share this URL (not the #/list/ hash link) so WhatsApp etc. can fetch title + image. */
export function shareListUrl(listId) {
  return `${SHARE_PREVIEW_BASE}?list=${encodeURIComponent(listId)}`;
}
