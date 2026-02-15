/* ──────────────────────────────────────────────
   ThemeManager — Light / Dark mode toggle
   ────────────────────────────────────────────── */
const ThemeManager = (() => {
  const STORAGE_KEY = 'spendlens-theme';

  function init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    apply(theme);
    document.getElementById('themeToggle').addEventListener('click', toggle);
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    apply(current === 'dark' ? 'light' : 'dark');
    if (window.ChartManager) ChartManager.onThemeChange();
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  return { init, isDark, toggle };
})();
