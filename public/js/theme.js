(function () {
  const THEME_KEY = 'eso_theme';
  const DARK_CLASS = 'dark-mode';

  function getStoredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  }

  function isDark() {
    return document.documentElement.classList.contains(DARK_CLASS);
  }

  function applyTheme(theme) {
    document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
    updateToggleIcon();
  }

  function toggleTheme() {
    applyTheme(isDark() ? 'light' : 'dark');
  }

  function updateToggleIcon() {
    const toggle = document.getElementById('globalThemeToggle');
    if (!toggle) return;

    const dark = isDark();
    toggle.innerHTML = dark
      ? '<i class="fas fa-sun"></i><span class="ml-2">Light</span>'
      : '<i class="fas fa-moon"></i><span class="ml-2">Dark</span>';
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  function injectThemeStyles() {
    if (document.getElementById('globalThemeStyles')) return;

    const style = document.createElement('style');
    style.id = 'globalThemeStyles';
    style.textContent = `
      html.dark-mode, html.dark-mode body { background: #0f172a !important; color: #e5e7eb !important; }
      html.dark-mode .bg-white { background-color: #111827 !important; }
      html.dark-mode .bg-gray-50 { background-color: #0b1220 !important; }
      html.dark-mode .bg-gray-100 { background-color: #111827 !important; }
      html.dark-mode .text-gray-900 { color: #f3f4f6 !important; }
      html.dark-mode .text-gray-800 { color: #e5e7eb !important; }
      html.dark-mode .text-gray-700 { color: #d1d5db !important; }
      html.dark-mode .text-gray-600 { color: #cbd5e1 !important; }
      html.dark-mode .text-gray-500 { color: #94a3b8 !important; }
      html.dark-mode .text-gray-400 { color: #94a3b8 !important; }
      html.dark-mode .border-gray-50,
      html.dark-mode .border-gray-100,
      html.dark-mode .border-gray-200,
      html.dark-mode .border-gray-300 { border-color: #374151 !important; }
      html.dark-mode .shadow-sm,
      html.dark-mode .shadow,
      html.dark-mode .shadow-lg,
      html.dark-mode .shadow-xl,
      html.dark-mode .shadow-2xl { box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35) !important; }
      html.dark-mode input,
      html.dark-mode select,
      html.dark-mode textarea {
        background-color: #0f172a !important;
        color: #e5e7eb !important;
        border-color: #475569 !important;
      }
      html.dark-mode table thead { background-color: #111827 !important; }
      html.dark-mode table tbody tr:hover { background-color: rgba(148, 163, 184, 0.08) !important; }
      html.dark-mode .hover\\:bg-gray-50:hover,
      html.dark-mode .hover\\:bg-gray-100:hover { background-color: rgba(148, 163, 184, 0.12) !important; }
      html.dark-mode .modal-overlay { background: rgba(2, 6, 23, 0.72) !important; }
      html.dark-mode img { opacity: 0.98; }
      #globalThemeToggle {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 80;
        border: 1px solid rgba(100, 116, 139, 0.35);
        border-radius: 9999px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        background: #ffffff;
        color: #111827;
        box-shadow: 0 10px 25px rgba(0,0,0,0.18);
      }
      html.dark-mode #globalThemeToggle {
        background: #111827;
        color: #f9fafb;
        border-color: #374151;
      }
    `;

    document.head.appendChild(style);
  }

  function createToggle() {
    if (document.getElementById('globalThemeToggle')) return;

    const toggle = document.createElement('button');
    toggle.id = 'globalThemeToggle';
    toggle.type = 'button';
    toggle.addEventListener('click', toggleTheme);
    document.body.appendChild(toggle);
    updateToggleIcon();
  }

  function initTheme() {
    injectThemeStyles();
    applyTheme(getStoredTheme());
    createToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
