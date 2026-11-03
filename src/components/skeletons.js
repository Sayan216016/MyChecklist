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

const gridHeader = `<th class="col-member"><div class="col-header"><span class="skeleton skeleton--avatar"></span><span class="skeleton skeleton--name"></span></div></th>`;
const cell = (width) => `<td class="grid-cell"><div class="item-card"><span class="skeleton skeleton--cell" style="width: ${width}%"></span></div></td>`;
const empty = `<td class="grid-cell grid-cell--empty"></td>`;

export function checklistSkeleton() {
  return `
    <div aria-busy="true" aria-label="Loading checklist">
      <span class="skeleton skeleton--heading"></span>
      <span class="skeleton skeleton--meta" style="margin-bottom: 1.5rem;"></span>

      <div class="mobile-only skeleton-mobile">
        <div class="skeleton-mobile__tabs">
          <span class="skeleton skeleton--tab"></span>
          <span class="skeleton skeleton--tab"></span>
          <span class="skeleton skeleton--tab"></span>
        </div>
        <span class="skeleton skeleton--button"></span>
        ${taskCard(80)}${taskCard(55)}${taskCard(70)}
      </div>

      <div class="grid-scroll grid-scroll--desktop">
        <table class="checklist-grid">
          <thead><tr><th class="col-index"></th>${gridHeader.repeat(3)}</tr></thead>
          <tbody>
            <tr><td class="col-index"></td>${cell(80)}${empty}${empty}</tr>
            <tr><td class="col-index"></td>${empty}${cell(60)}${empty}</tr>
            <tr><td class="col-index"></td>${empty}${empty}${cell(70)}</tr>
          </tbody>
        </table>
      </div>
    </div>`;
}
