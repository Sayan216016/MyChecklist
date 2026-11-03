/**
 * Checklist page: one column per collaborator, one row per task.
 * Desktop = full grid; mobile = one column at a time via tabs. Both render the same task cards.
 */
import { escapeHtml, formatWhen, memberStripeClass } from "../utils/helpers.js";
import { renderHeader, avatarHtml } from "../components/layout.js";

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
function itemCard(item, view, idPrefix) {
  const cls = [
    "item-card",
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
        ${doneMeta(item, view.uid)}
      </div>
      ${actions}
    </div>`;
}

function renderMobileView(items, members, view, activeMemberUid, freshIds) {
  const member = members.find((m) => m.uid === activeMemberUid) || members[0];
  if (!member) return "";

  const rows = items
    .map((item, i) =>
      item.addedBy === member.uid
        ? `
        <article class="mobile-row-card${freshIds.has(item.id) ? " row-enter" : ""}">
          <div class="mobile-row-card__index">Row ${i + 1}</div>
          ${itemCard(item, view, "m")}
        </article>`
        : "",
    )
    .join("");

  const addBtn =
    member.uid === view.uid
      ? `<button type="button" class="btn btn--secondary btn--sm col-header__add-btn" data-action="add-tasks" style="margin-bottom: 0.75rem;">+ Add tasks</button>`
      : "";

  return `
    ${addBtn}
    ${rows || `<p class="page-subtitle">No tasks in this column yet.</p>`}`;
}

export function renderChecklist(
  user,
  list,
  members,
  items,
  { mobileMemberUid, editingId, editDraft, poppedId, leavingIds, freshIds },
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

  const mobileTabs = members
    .map((m) => {
      const active = m.uid === mobileMemberUid;
      const label = m.uid === user.uid ? "You" : escapeHtml((m.displayName || m.email).split(" ")[0]);
      return `<button type="button" class="mobile-tabs__tab${active ? " mobile-tabs__tab--active" : ""}" data-mobile-tab="${m.uid}" role="tab">${label}</button>`;
    })
    .join("");

  const headerCols = members
    .map((m) => {
      const isYou = m.uid === user.uid;
      const isListOwner = m.uid === list.createdBy;
      const addRow = isYou
        ? `<button type="button" class="btn btn--secondary btn--sm col-header__add-btn" data-action="add-tasks">+ Add tasks</button>`
        : "";
      const badge = isListOwner ? `<span class="col-header__badge">Owner</span>` : "";
      return `
        <th class="col-member" scope="col">
          <div class="col-header">
            <div class="col-header__inner">
              ${avatarHtml(m, { size: "lg" })}
              <span class="col-header__name">${isYou ? "You" : escapeHtml(m.displayName || m.email)}</span>
              ${badge}
              ${addRow}
            </div>
          </div>
        </th>`;
    })
    .join("");

  const bodyRows = items
    .map((item, index) => {
      const cells = members
        .map((m) =>
          item.addedBy === m.uid
            ? `<td class="grid-cell">${itemCard(item, view, "d")}</td>`
            : `<td class="grid-cell grid-cell--empty"></td>`,
        )
        .join("");
      return `
        <tr${freshIds.has(item.id) ? ' class="row-enter"' : ""}>
          <td class="col-index">${index + 1}</td>
          ${cells}
        </tr>`;
    })
    .join("");

  const emptyRow =
    items.length === 0
      ? `
        <tr>
          <td class="col-index">—</td>
          ${members.map(() => `<td class="grid-cell grid-cell--empty"></td>`).join("")}
        </tr>`
      : "";

  const ownerActions = isOwner
    ? `
      <button type="button" class="btn btn--secondary btn--sm" data-action="open-invite">Invite</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="delete-list">Delete list</button>`
    : "";

  return `
    <div class="app-shell">
      ${renderHeader(user)}
      <main class="app-main app-main--wide">
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

        <div class="mobile-tabs mobile-only" role="tablist" aria-label="Collaborator columns">
          ${mobileTabs}
        </div>

        <div class="mobile-list mobile-only">
          ${renderMobileView(items, members, view, mobileMemberUid, freshIds)}
        </div>

        <div class="grid-scroll grid-scroll--desktop">
          <table class="checklist-grid" role="grid" aria-label="Collaborative checklist">
            <thead>
              <tr>
                <th class="col-index" scope="col">#</th>
                ${headerCols}
              </tr>
            </thead>
            <tbody>${bodyRows}${emptyRow}</tbody>
          </table>
        </div>
      </main>
    </div>`;
}
