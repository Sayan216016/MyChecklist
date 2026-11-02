import { escapeHtml, initials, memberColorClass } from "../util.js";

export function renderHeader(user, { showSignOut = true } = {}) {
  const name = escapeHtml(user.displayName || user.email || "User");
  const ini = escapeHtml(initials(user.displayName, user.email));
  const signOutBtn = showSignOut
    ? `<button type="button" class="btn btn--ghost btn--sm" data-action="sign-out">Sign out</button>`
    : "";

  return `
    <header class="app-header">
      <a class="app-header__brand" href="#/" data-link>
        <span class="app-header__logo" aria-hidden="true">✓</span>
        MyChecklist
      </a>
      <div class="app-header__actions">
        <div class="user-chip">
          ${
            user.photoURL
              ? `<img class="avatar avatar--sm" src="${escapeHtml(user.photoURL)}" alt="" />`
              : `<span class="avatar avatar--initials avatar--sm" aria-hidden="true">${ini}</span>`
          }
          <span>${name}</span>
        </div>
        ${signOutBtn}
      </div>
    </header>`;
}

export function avatarHtml(member, { size = "sm", you = false } = {}) {
  const cls = size === "lg" ? "avatar avatar--lg" : "avatar avatar--sm";
  const color = memberColorClass(member.uid);
  const ini = escapeHtml(initials(member.displayName, member.email));
  if (member.photoURL) {
    return `<img class="${cls}" src="${escapeHtml(member.photoURL)}" alt="" />`;
  }
  return `<span class="${cls} avatar--initials ${color}" aria-hidden="true">${ini}</span>`;
}
