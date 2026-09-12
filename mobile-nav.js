// Mobile nav toggle - shared by every category/product/account page that
// doesn't already load script.js (which has its own copy of this same
// logic for the homepage/static pages). Extracted out of each page's inline
// <script> block so the site can run under a strict CSP with no
// 'unsafe-inline' on script-src.
(function () {
  // Alcohol age-restriction banner (bauturi.html only - the element simply
  // doesn't exist on other pages, so this is a no-op there).
  if (window.bkIsMinor && window.bkIsMinor()) {
    const notice = document.getElementById('bauturiAgeNotice');
    if (notice) notice.hidden = false;
  }

  const navToggle = document.getElementById('navToggle');
  const navClose = document.getElementById('navClose');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');
  const openMobileNav = () => { mobileNav.classList.add('open'); mobileNavBackdrop?.classList.add('open'); };
  const closeMobileNav = () => { mobileNav.classList.remove('open'); mobileNavBackdrop?.classList.remove('open'); };
  navToggle?.addEventListener('click', openMobileNav);
  navClose?.addEventListener('click', closeMobileNav);
  mobileNavBackdrop?.addEventListener('click', closeMobileNav);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileNav(); });
  mobileNav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobileNav));
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  mobileNav?.querySelectorAll('.mobile-nav-link').forEach((a) => { if (a.getAttribute('href') === currentPage) a.classList.add('is-active'); });
})();
