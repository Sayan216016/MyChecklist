/**
 * Generic popup. Mounted on <body>, outside #app, because #app is re-rendered on every
 * Firestore snapshot and would otherwise wipe what the user is typing.
 * Closes on backdrop click, Escape, ✕ and any [data-close] element. One modal at a time.
 */
let current = null;

export function openModal({ title, subtitle = "", body, footer, wide = false }) {
  closeModal();

  const el = document.createElement("div");
  el.className = "modal-backdrop is-open";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "modal-title");
  el.innerHTML = `
    <div class="modal${wide ? " modal--wide" : ""}">
      <button type="button" class="icon-btn modal__close" aria-label="Close" data-close>✕</button>
      <div class="modal__header">
        <h2 id="modal-title">${title}</h2>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
      <div class="modal__body">${body}</div>
      <div class="modal__footer">${footer}</div>
    </div>`;

  const onKey = (e) => {
    if (e.key === "Escape") closeModal();
  };
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", onKey);
  document.body.append(el);

  current = { el, onKey, opener: document.activeElement };
  el.querySelector(".modal__body input:not([readonly]), .modal__body textarea")?.focus();
  return el;
}

export function closeModal() {
  if (!current) return;
  const { el, onKey, opener } = current;
  current = null;
  document.removeEventListener("keydown", onKey);
  el.remove();
  if (opener?.isConnected) opener.focus();
}
