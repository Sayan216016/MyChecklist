import { escapeHtml, formatWhen } from "../util.js";
import { renderHeader, avatarHtml } from "./layout.js";

function doneMeta(item, currentUid) {
  if (!item.completed || !item.completedByName) return "";
  const who =
    item.completedBy === currentUid
      ? `${escapeHtml(item.completedByName)} (you)`
      : escapeHtml(item.completedByName);
  const when = formatWhen(item.completedAt);
  return `<p class="check-item__meta">Done by ${who}${when ? ` · ${when}` : ""}</p>`;
}

function renderItemCell(item, currentUid, rowNum, memberUid) {
  if (!item || item.addedBy !== memberUid) {
    return `<td class="grid-cell grid-cell--empty"></td>`;
  }
  const id = `item-${item.id}`;
  const doneCls = item.completed ? " check-item--done" : "";
  return `
    <td class="grid-cell">
      <div class="check-item${doneCls}">
        <div class="check-item__row">
          <input class="check-item__input" type="checkbox" id="${id}" data-item-id="${item.id}" ${item.completed ? "checked" : ""} />
          <label class="check-item__label" for="${id}">${escapeHtml(item.text)}</label>
        </div>
        ${doneMeta(item, currentUid)}
      </div>
    </td>`;
}

function renderMobileView(items, members, currentUid, activeMemberUid) {
  const member = members.find((m) => m.uid === activeMemberUid) || members[0];
  if (!member) return "";

  const rows = items
    .map((item, i) => {
      const owner = members.find((m) => m.uid === item.addedBy);
      const ownerLabel =
        item.addedBy === currentUid ? "Your item" : `${owner?.displayName || "Someone"}'s item`;
      const show = item.addedBy === member.uid;
      if (!show) return "";

      const id = `m-${item.id}`;
      const doneCls = item.completed ? " check-item--done" : "";
      return `
        <article class="mobile-row-card">
          <div class="mobile-row-card__index">Row ${i + 1} · ${escapeHtml(ownerLabel)}</div>
          <div class="check-item${doneCls}">
            <div class="check-item__row">
              <input class="check-item__input" type="checkbox" id="${id}" data-item-id="${item.id}" ${item.completed ? "checked" : ""} />
              <label class="check-item__label" for="${id}">${escapeHtml(item.text)}</label>
            </div>
            ${doneMeta(item, currentUid)}
          </div>
        </article>`;
    })
    .join("");

  const addBlock =
    member.uid === currentUid
      ? `
        <div class="add-item-inline" style="margin-top: 0.75rem;">
          <input type="text" placeholder="Add item in your column…" aria-label="New item" data-mobile-add-input />
          <button type="button" class="btn btn--primary btn--sm" data-action="add-item-mobile">Add</button>
        </div>`
      : "";

  return `
    <p class="page-subtitle" style="margin-top: 0;">Showing <strong>${member.uid === currentUid ? "your column" : escapeHtml(member.displayName)}</strong>.</p>
    ${rows || `<p class="page-subtitle">No items in this column yet.</p>`}
    ${addBlock}`;
}

export function renderChecklist(
  user,
  list,
  members,
  items,
  { mobileMemberUid, shareUrl, inviteOpen },
) {
  const isOwner = list.createdBy === user.uid;
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
        ? `
          <div class="col-header__add add-item-inline">
            <input type="text" placeholder="Add item…" aria-label="Add item in your column" data-add-input="${m.uid}" />
            <button type="button" class="btn btn--primary btn--sm" data-action="add-item" data-member="${m.uid}">Add</button>
          </div>`
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
      const cells = members.map((m) => renderItemCell(item, user.uid, index + 1, m.uid)).join("");
      return `
        <tr>
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

  const modalCls = inviteOpen ? "modal-backdrop is-open" : "modal-backdrop";

  return `
    <div class="app-shell">
      ${renderHeader(user)}
      <main class="app-main app-main--wide">
        <div class="checklist-toolbar">
          <div>
            <h1>${title}</h1>
            <p class="checklist-toolbar__meta">${ownerMeta} · ${members.length} collaborator${members.length === 1 ? "" : "s"} · Live updates</p>
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
          ${renderMobileView(items, members, user.uid, mobileMemberUid)}
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
    </div>

    <div class="${modalCls}" id="invite-modal" role="dialog" aria-labelledby="invite-title" aria-modal="true" ${inviteOpen ? "" : "hidden"}>
      <div class="modal">
        <div class="modal__header">
          <h2 id="invite-title">Invite collaborators</h2>
          <p>They’ll see this list after signing in with the invited Gmail address.</p>
        </div>
        <div class="modal__body">
          <div class="field">
            <label for="invite-email">Email address</label>
            <input id="invite-email" type="email" placeholder="friend@gmail.com" data-invite-email />
            <p class="field__hint">Must match their Google account email.</p>
          </div>
          <div class="field">
            <label for="invite-link">Share link</label>
            <div class="copy-link">
              <input id="invite-link" type="text" readonly value="${escapeHtml(shareUrl)}" />
              <button type="button" class="btn btn--secondary btn--sm" data-action="copy-link">Copy</button>
            </div>
          </div>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" data-action="close-invite">Cancel</button>
          <button type="button" class="btn btn--primary" data-action="send-invite">Send invite</button>
        </div>
      </div>
    </div>`;
}
