export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function initials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
}

function memberColorIndex(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash + uid.charCodeAt(i)) % 4;
  return hash + 1;
}

/** Avatar background for a member (colour 1 = default primary). */
export function memberColorClass(uid) {
  const n = memberColorIndex(uid);
  return n === 1 ? "" : `avatar--color-${n}`;
}

/** Same colour as the member's avatar, for the task card's left stripe. */
export function memberStripeClass(uid) {
  const n = memberColorIndex(uid);
  return n === 1 ? "" : `member-color-${n}`;
}

export function formatWhen(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const wasYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (wasYesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** `action` = { label, onClick } adds a button (e.g. "Undo") that also dismisses the toast. */
export function showToast(message, isError = false, { action, duration = 4000 } = {}) {
  const el = document.getElementById("toast");
  if (!el) return;
  const hide = () => (el.hidden = true);
  el.textContent = message;
  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast__action";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      clearTimeout(showToast._t);
      hide();
      action.onClick();
    });
    el.append(btn);
  }
  el.hidden = false;
  el.classList.toggle("toast--error", isError);
  clearTimeout(showToast._t);
  showToast._t = setTimeout(hide, duration);
}

/** "One task per line" input → trimmed lines, blanks skipped. */
export function parseLines(text) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
