/** Loading placeholders. The checklist has a separate mobile shape (mobile is the main use case). */

const listCard = (title = 45, meta = 30) => `
  <div class="list-card list-card--skeleton">
    <span class="skeleton skeleton--icon"></span>
    <div class="list-card__body">
      <span class="skeleton skeleton--title" style="width: ${title}%"></span>
      <span class="skeleton skeleton--meta" style="width: ${meta}%"></span>
    </div>
  </div>`;

export function homeSkeleton() {
  return `<div class="list-cards" aria-busy="true" aria-label="Loading lists">${listCard()}${listCard(35, 22)}${listCard(40, 26)}</div>`;
}

const taskCard = (width) =>
  `<div class="item-card"><span class="skeleton skeleton--box"></span><span class="skeleton skeleton--cell" style="width: ${width}%"></span></div>`;

const note = (height = 52) => `<span class="skeleton skeleton--note" style="height: ${height}px"></span>`;

export function checklistSkeleton() {
  return `
    <div aria-busy="true" aria-label="Loading checklist">
      <span class="skeleton skeleton--heading"></span>
      <span class="skeleton skeleton--meta" style="margin-bottom: 1.5rem;"></span>

      <div class="mobile-only skeleton-mobile">
        <span class="skeleton skeleton--button"></span>
        ${taskCard(80)}${taskCard(55)}${taskCard(70)}
      </div>

      <div class="checklist-board checklist-board--desktop">
        <div class="skeleton-wall">
          ${note()}${note(64)}${note(48)}${note()}${note(56)}${note(44)}
        </div>
      </div>
    </div>`;
}
