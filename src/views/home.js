import { escapeHtml, formatWhen } from "../utils/helpers.js";
import { renderHeader, avatarHtml } from "../components/layout.js";
import { homeSkeleton } from "../components/skeletons.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** `summary` ({ total, done, owner }) arrives after the list itself; the card fills in when it does. */
function listCard({ list, summary }, currentUid) {
  const isOwner = list.createdBy === currentUid;
  const people = plural(list.memberIds?.length || 0, "collaborator");
  const parts = [people];
  let ownerHtml = "";
  let progress = "";

  if (summary) {
    if (isOwner) {
      parts.push(plural(summary.total, "item"));
    } else {
      ownerHtml = `<span class="list-card__owner">${avatarHtml(summary.owner)}${escapeHtml(summary.owner.displayName)}</span> · `;
      parts.push(`${summary.done} / ${summary.total} done`);
      const pct = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
      progress = `<div class="progress" aria-hidden="true"><span class="progress__bar" style="width: ${pct}%"></span></div>`;
    }
  }
  const updated = formatWhen(list.updatedAt);
  if (isOwner && updated) parts.push(`Updated ${updated.toLowerCase().startsWith("today") ? "today" : updated}`);

  return `
    <a class="list-card" href="#/list/${list.id}" data-link>
      <div class="list-card__icon" aria-hidden="true">📋</div>
      <div class="list-card__body">
        <p class="list-card__title">${escapeHtml(list.title)}</p>
        <p class="list-card__meta">${ownerHtml}${parts.join(" · ")}</p>
        ${progress}
      </div>
      <span class="list-card__chevron" aria-hidden="true">›</span>
    </a>`;
}

function section(id, title, rows, uid) {
  if (!rows.length) return "";
  return `
    <section class="section" aria-labelledby="${id}">
      <h2 id="${id}" class="section__title">${title}</h2>
      <div class="list-cards">${rows.map((row) => listCard(row, uid)).join("")}</div>
    </section>`;
}

export function renderHome(user, { created, shared, loading }) {
  const newBtn = `<button type="button" class="btn btn--primary" data-action="new-list">+ New checklist</button>`;

  const isEmpty = !loading && !created.length && !shared.length;
  let content;
  if (loading) {
    content = homeSkeleton();
  } else if (isEmpty) {
    content = `
      <div class="empty-state">
        <div class="empty-state__icon" aria-hidden="true">✓</div>
        <h2>Create your first checklist</h2>
        <p>Add tasks, invite people by their Gmail address, and tick things off together in real time.</p>
        ${newBtn}
        <p class="empty-state__hint">Expecting a shared list? Ask the owner to invite <strong>${escapeHtml(user.email || "your Gmail")}</strong> — it’ll appear here automatically.</p>
      </div>`;
  } else {
    content =
      section("created-heading", "Created by me", created, user.uid) +
      section("shared-heading", "Shared with me", shared, user.uid);
  }

  return `
    <div class="app-shell">
      ${renderHeader(user)}
      <main class="app-main">
        <div class="home-toolbar">
          <div>
            <h1 class="page-title">Your <span class="page-title__accent">checklists</span></h1>
            <p class="page-subtitle">Lists you created and lists shared with you.</p>
          </div>
          ${isEmpty ? "" : newBtn}
        </div>
        ${content}
      </main>
    </div>`;
}
