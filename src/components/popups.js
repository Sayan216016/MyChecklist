/**
 * The app's popups: new checklist, add tasks, invite.
 * Each takes an async callback that does the Firestore write; the popup closes on success,
 * stays open with a toast on failure.
 */
import { openModal, closeModal } from "./modal.js";
import { parseLines, showToast } from "../utils/helpers.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Click on submit, Enter in a text input, or Ctrl/⌘+Enter anywhere runs `run`, once at a time. */
function bindSubmit(el, run) {
  const btn = el.querySelector("[data-submit]");
  let busy = false;
  const submit = async () => {
    if (busy || btn.disabled) return;
    busy = true;
    btn.disabled = true;
    try {
      await run();
      closeModal();
    } catch (e) {
      showToast(e.message, true);
      btn.disabled = false;
    } finally {
      busy = false;
    }
  };
  btn.addEventListener("click", submit);
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.ctrlKey || e.metaKey || e.target.matches("input:not([readonly])")) {
      e.preventDefault();
      submit();
    }
  });
}

/** Live "n tasks" count for a one-task-per-line textarea. */
function bindTaskCount(el, onCount) {
  const textarea = el.querySelector("textarea");
  const update = () => {
    const n = parseLines(textarea.value).length;
    el.querySelector(".field__count").textContent = plural(n, "task");
    onCount(n);
  };
  textarea.addEventListener("input", update);
  update();
}

export function openNewChecklistPopup(onCreate) {
  const el = openModal({
    title: "New checklist",
    subtitle: "You can invite people after creating it.",
    wide: true,
    body: `
      <div class="field">
        <label for="new-list-title">Title</label>
        <input id="new-list-title" type="text" placeholder="e.g. Goa trip — March" maxlength="200" />
      </div>
      <div class="field">
        <label for="new-list-tasks">First tasks (optional) <span class="field__count"></span></label>
        <textarea id="new-list-tasks" placeholder="One task per line"></textarea>
        <p class="field__hint">Each line becomes a task in your column.</p>
      </div>`,
    footer: `
      <button type="button" class="btn btn--ghost" data-close>Cancel</button>
      <button type="button" class="btn btn--primary" data-submit>Create checklist</button>`,
  });
  const title = el.querySelector("#new-list-title");
  bindTaskCount(el, () => {});
  bindSubmit(el, () => onCreate(title.value, parseLines(el.querySelector("textarea").value)));
}

export function openAddTasksPopup(onAdd) {
  const el = openModal({
    title: "Add tasks",
    subtitle: "Each line becomes a new task in your column.",
    wide: true,
    body: `
      <div class="field">
        <label for="add-tasks">Tasks <span class="field__count"></span></label>
        <textarea id="add-tasks" placeholder="Book flights&#10;Pack sunscreen&#10;Download offline maps"></textarea>
        <p class="field__hint">Blank lines are skipped · Ctrl + Enter to add</p>
      </div>`,
    footer: `
      <button type="button" class="btn btn--ghost" data-close>Cancel</button>
      <button type="button" class="btn btn--primary" data-submit>Add tasks</button>`,
  });
  const btn = el.querySelector("[data-submit]");
  bindTaskCount(el, (n) => {
    btn.textContent = n ? `Add ${plural(n, "task")}` : "Add tasks";
    btn.disabled = n === 0;
  });
  bindSubmit(el, () => onAdd(parseLines(el.querySelector("textarea").value)));
}

export function openInvitePopup(onInvite) {
  const el = openModal({
    title: "Invite collaborators",
    subtitle: "They’ll see this list after signing in with the invited Gmail address.",
    body: `
      <div class="field">
        <label for="invite-email">Email address</label>
        <input id="invite-email" type="email" placeholder="friend@gmail.com" />
        <p class="field__hint">Must match their Google account email. The list appears on their home page once they sign in.</p>
      </div>`,
    footer: `
      <button type="button" class="btn btn--ghost" data-close>Cancel</button>
      <button type="button" class="btn btn--primary" data-submit>Send invite</button>`,
  });
  bindSubmit(el, () => onInvite(el.querySelector("#invite-email").value));
}
