// Loaded in <head> so the saved theme applies before first paint (no light flash).
(function () {
  const root = document.documentElement;
  const saved = localStorage.getItem("theme");
  const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "dark" : "light";

  document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll("[data-theme-toggle]");
    const sync = () =>
      buttons.forEach((b) => {
        const isDark = root.dataset.theme === "dark";
        b.textContent = isDark ? "☀️" : "🌙";
        b.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
      });
    buttons.forEach((b) =>
      b.addEventListener("click", () => {
        root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem("theme", root.dataset.theme);
        sync();
      })
    );
    sync();
  });
})();
