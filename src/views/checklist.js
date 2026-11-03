/**
 * Checklist page: one shared list — anyone adds, anyone ticks.
 * Desktop = sticky-note wrap grid; mobile = same tasks, one column.
 */
import { escapeHtml, formatWhen, memberStripeClass } from "../utils/helpers.js";
import { renderHeader, avatarHtml } from "../components/layout.js";

function addedMeta(item, members, currentUid) {
  const m = members.find((x) => x.uid === item.addedBy);
  let who = "someone";
  if (item.addedBy === currentUid) who = "you";
  else if (m) who = escapeHtml(m.displayName || m.email);
  return `<p class="item-card__added">Added by ${who}</p>`;
}

function doneMeta(item, currentUid) {
  if (!item.completed || !item.completedByName) return "";
  const who =
    item.completedBy === currentUid
      ? `${escapeHtml(item.completedByName)} (you)`
      : escapeHtml(item.completedByName);
  const when = formatWhen(item.completedAt);
  return `<p class="check-item__meta">Done by ${who}${when ? ` · ${when}` : ""}</p>`;
}

/**
 * view: { uid, isOwner, editingId, editDraft, poppedId, leavingIds }
 * ✎ / 🗑 render only for the task's creator or the list owner; everyone else can just tick.
 */
function itemCard(item, view, members, idPrefix) {
  const cls = [
    "item-card",
    "item-card--sticky",
    memberStripeClass(item.addedBy),
    item.completed ? "item-card--done" : "",
    view.leavingIds.has(item.id) ? "item-card--leaving" : "",
  ].filter(Boolean).join(" ");

  if (view.editingId === item.id) {
    return `
      <div class="${cls}">
        <div class="item-edit">
          <input type="text" value="${escapeHtml(view.editDraft)}" maxlength="500" aria-label="Edit task text" data-edit-input />
          <span class="item-edit__hint">Enter to save · Esc to cancel</span>
        </div>
      </div>`;
  }

  const id = `${idPrefix}-${item.id}`;
  const canEdit = item.addedBy === view.uid || view.isOwner;
  const actions = canEdit
    ? `
      <div class="item-actions">
        <button type="button" class="icon-btn" aria-label="Edit task" title="Edit" data-edit-item="${item.id}">✎</button>
        <button type="button" class="icon-btn icon-btn--danger" aria-label="Delete task" title="Delete" data-delete-item="${item.id}">🗑</button>
      </div>`
    : "";

  return `
    <div class="${cls}">
      <div class="check-item${item.completed ? " check-item--done" : ""}">
        <div class="check-item__row">
          <input class="check-item__input${view.poppedId === item.id ? " is-fresh" : ""}" type="checkbox" id="${id}" data-item-id="${item.id}" ${item.completed ? "checked" : ""} />
          <label class="check-item__label" for="${id}">${escapeHtml(item.text)}</label>
        </div>
        ${addedMeta(item, members, view.uid)}
        ${doneMeta(item, view.uid)}
      </div>
      ${actions}
    </div>`;
}

function renderTaskWall(items, members, view, idPrefix, freshIds, { mobile }) {
  if (!items.length) {
    return `<p class="page-subtitle">No tasks yet. Add the first one above.</p>`;
  }
  return items
    .map((item) => {
      const card = itemCard(item, view, members, idPrefix);
      const enter = freshIds.has(item.id) ? " row-enter" : "";
      if (mobile) return `<article class="mobile-row-card${enter}">${card}</article>`;
      return `<div class="task-wall__cell${enter}">${card}</div>`;
    })
    .join("");
}

const addTasksBar = `
  <div class="checklist-actions">
    <button type="button" class="btn btn--secondary btn--sm col-header__add-btn" data-action="add-tasks">+ Add tasks</button>
    <p class="checklist-actions__hint">Anyone can add · anyone can tick</p>
  </div>`;

export function renderListGone(user, title) {
  const name = title ? escapeHtml(title) : "This checklist";
  return `
    <div class="app-shell">
      ${renderHeader(user)}
      <main class="app-main app-main--wide">
        <a class="btn btn--secondary btn--sm back-btn" href="#/" data-link>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Dashboard
        </a>
        <div class="list-gone" role="status">
          <h2 class="list-gone__title">This checklist was deleted</h2>
          <p class="list-gone__text">The owner removed “${name}”. You can’t open it anymore.</p>
          <a class="btn btn--primary" href="#/" data-link>Back to dashboard</a>
        </div>
      </main>
    </div>`;
}

export function renderChecklist(
  user,
  list,
  members,
  items,
  { editingId, editDraft, poppedId, leavingIds, freshIds },
) {
  const isOwner = list.createdBy === user.uid;
  const view = { uid: user.uid, isOwner, editingId, editDraft, poppedId, leavingIds };
  const done = items.filter((i) => i.completed).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const ownerMeta = isOwner ? "You’re the owner" : "Collaborator";
  const title = escapeHtml(list.title);

  const memberPills = members
    .map((m) => {
      const you = m.uid === user.uid;
      return `
        <span class="member-pill${you ? " member-pill--you" : ""}">
          ${avatarHtml(m, { size: "sm" })}
          ${you ? "You" : escapeHtml(m.displayName || m.email)}
        </span>`;
    })
    .join("");

  const ownerActions = isOwner
    ? `
      <button type="button" class="btn btn--secondary btn--sm" data-action="open-invite">Invite</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="delete-list">Delete list</button>`
    : "";

  const mobileTasks = renderTaskWall(items, members, view, "m", freshIds, { mobile: true });
  const desktopTasks = renderTaskWall(items, members, view, "d", freshIds, { mobile: false });

  return `
    <div class="app-shell">
      ${renderHeader(user)}
      <main class="app-main app-main--wide">
        <a class="btn btn--secondary btn--sm back-btn" href="#/" data-link>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Dashboard
        </a>
        <div class="checklist-toolbar">
          <div>
            <h1>${title}</h1>
            <p class="checklist-toolbar__meta">${ownerMeta} · ${members.length} collaborator${members.length === 1 ? "" : "s"} · ${done} / ${items.length} done</p>
            <div class="progress" aria-hidden="true"><span class="progress__bar" style="width: ${pct}%"></span></div>
          </div>
          <div class="checklist-toolbar__actions">${ownerActions}</div>
        </div>

        <div class="members-bar">
          <span class="members-bar__label">Collaborators</span>
          ${memberPills}
        </div>

        <div class="mobile-only">${addTasksBar}</div>
        <div class="mobile-list mobile-only" role="list" aria-label="Shared tasks">
          ${mobileTasks}
        </div>

        <div class="checklist-board--desktop">${addTasksBar}</div>
        <div class="checklist-board checklist-board--desktop" role="region" aria-label="Shared tasks">
          <div class="task-wall">${desktopTasks}</div>
        </div>
      </main>
    </div>`;
}
