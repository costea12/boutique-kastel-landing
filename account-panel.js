// cont.html's tab switcher (Comenzi / Favorite / Date cont etc.) - extracted
// out of an inline <script> so the site can run under a strict CSP with no
// 'unsafe-inline' on script-src.
(function () {
  const nav = document.getElementById('accountNav');
  const panels = document.querySelectorAll('.account-panel');
  function showPanel(name) {
    nav.querySelectorAll('.account-nav-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.panel === name);
    });
    panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));
  }
  nav?.addEventListener('click', (e) => {
    const btn = e.target.closest('.account-nav-item');
    if (!btn) return;
    showPanel(btn.dataset.panel);
    history.replaceState(null, '', btn.dataset.panel === 'favorites' ? '#favorites' : '#' + btn.dataset.panel);
  });
  if (window.location.hash === '#favorites') showPanel('favorites');
  if (window.location.hash === '#orders') showPanel('orders');
})();
