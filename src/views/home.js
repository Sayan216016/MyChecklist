import { escapeHtml } from "../util.js";
import { renderHeader } from "./layout.js";

function listCard(list, currentUid) {
  const isOwner = list.createdBy === currentUid;
  const count = list.memberIds?.length || 0;
  const meta = isOwner
    ? `${count} collaborator${count === 1 ? "" : "s"}`
    : "Shared with you";

  return `
    <a class="list-card" href="#/list/${list.id}" data-link>
      <div class="list-card__icon" aria-hidden="true">📋</div>
      <div class="list-card__body">
        <p class="list-card__title">${escapeHtml(list.title)}</p>
        <p class="list-card__meta">${meta}</p>
      </div>
      <span class="list-card__chevron" aria-hidden="true">›</span>
    </a>`;
}

export function renderHome(user, { created, shared, loading }) {
  const createdHtml = created.length
    ? created.map((row) => listCard(row.list, user.uid)).join("")
    : `<p class="page-subtitle">No lists yet. Create one to get started.</p>`;

  const sharedHtml = shared.length
    ? shared.map((row) => listCard(row.list, user.uid)).join("")
    : `<p class="page-subtitle">Nothing shared with you yet.</p>`;

  return `
    <div class="app-shell">
      ${renderHeader(user)}
      <main class="app-main">
        <div class="home-toolbar">
          <div>
            <h1 class="page-title">Your checklists</h1>
            <p class="page-subtitle">Lists you created and lists shared with you.</p>
          </div>
          <button type="button" class="btn btn--primary" data-action="new-list" ${loading ? "disabled" : ""}>+ New checklist</button>
        </div>

        <section class="section" aria-labelledby="created-heading">
          <h2 id="created-heading" class="section__title">Created by me</h2>
          <div class="list-cards">${createdHtml}</div>
        </section>

        <section class="section" aria-labelledby="shared-heading">
          <h2 id="shared-heading" class="section__title">Shared with me</h2>
          <div class="list-cards">${sharedHtml}</div>
        </section>
      </main>
    </div>`;
}
