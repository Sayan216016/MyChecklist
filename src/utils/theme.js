/**
 * Light/dark theme. The initial value is set by the inline script in index.html <head>;
 * this module renders the 🌙/☀️ button and flips + saves the theme on click.
 */
const root = document.documentElement;
const isDark = () => root.dataset.theme === "dark";

export function themeToggleHtml(extraClass = "") {
  const label = isDark() ? "Switch to light theme" : "Switch to dark theme";
  return `<button type="button" class="theme-toggle ${extraClass}" data-theme-toggle aria-label="${label}">${isDark() ? "☀️" : "🌙"}</button>`;
}

/** Call once: one delegated listener survives every #app re-render. */
export function initThemeToggle() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    root.dataset.theme = isDark() ? "light" : "dark";
    localStorage.setItem("theme", root.dataset.theme);
    btn.outerHTML = themeToggleHtml(btn.classList.contains("signin-page__theme") ? "signin-page__theme" : "");
  });
}
