document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const sync = () => {
    const theme = document.documentElement.dataset.theme || 'dark';
    btn.textContent = theme === 'light' ? '☾' : '☀';
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  };
  sync();
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('nq-theme', next);
    window.__nqApplyTheme(next);
    sync();
  });
});
