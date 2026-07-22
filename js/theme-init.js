(function () {
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
  }
  window.__nqApplyTheme = apply;
  apply(localStorage.getItem('nq-theme') || 'dark');
})();
