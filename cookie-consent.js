// Cookie consent banner - shared across every page.
//
// Right now the site sets no non-essential cookies at all: no Google
// Analytics, no Meta Pixel, nothing (Firebase Auth's session and the
// localStorage cart are strictly necessary/functional, exempt from consent
// under ePrivacy). So this banner isn't blocking anything today - it's here
// so the site is ready the moment analytics/ad tracking gets added (e.g.
// once paid marketing starts): any future tracking script should be loaded
// conditionally behind window.bkCookieConsent() === 'all', never
// unconditionally, or this banner becomes decorative instead of doing its
// actual job.
(function () {
  const STORAGE_KEY = 'bkCookieConsent'; // 'all' | 'necessary'

  window.bkCookieConsent = function () {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  };

  try {
    if (localStorage.getItem(STORAGE_KEY) !== null) return; // already answered
  } catch (e) {
    return;
  }

  function build() {
    const bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Consimțământ cookie-uri');
    bar.innerHTML = `
      <p>Folosim cookie-uri strict necesare pentru funcționarea coșului și a contului. Cu acordul tău, putem folosi și cookie-uri opționale de analiză, pentru a înțelege mai bine cum este folosit site-ul. Detalii în <a href="confidentialitate.html">Politica de confidențialitate</a>.</p>
      <div class="cookie-bar-actions">
        <button type="button" class="btn btn-outline" id="cookieNecessary">Doar necesare</button>
        <button type="button" class="btn btn-gold" id="cookieAcceptAll">Acceptă toate</button>
      </div>
    `;
    document.body.appendChild(bar);
    return bar;
  }

  function init() {
    const bar = build();
    function answer(value) {
      try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
      bar.remove();
    }
    bar.querySelector('#cookieAcceptAll').addEventListener('click', () => answer('all'));
    bar.querySelector('#cookieNecessary').addEventListener('click', () => answer('necessary'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
