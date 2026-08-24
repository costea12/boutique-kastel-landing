// Newsletter popup - shared across every page.
// Shows once, 7 seconds after the site is first opened, then stays quiet
// for 24 hours - no matter how many products/pages/tabs someone opens in
// that time - using localStorage with a timestamp (not sessionStorage,
// which resets per-tab and would reappear if a link opens in a new tab).
// After 24 hours it's treated as a new visit and can show once again.
(function () {
  const STORAGE_KEY = 'bkNewsletterPopupShownAt';
  const QUIET_PERIOD_MS = 24 * 60 * 60 * 1000;

  let shownRecently = false;
  try {
    const lastShown = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    shownRecently = Date.now() - lastShown < QUIET_PERIOD_MS;
  } catch (e) {}
  if (shownRecently) return;

  function markShown() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
  }

  function buildPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="popupTitle">
        <div class="popup-banner"></div>
        <button type="button" class="popup-close" aria-label="Închide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>
        </button>
        <div class="popup-body">
          <p class="popup-kicker kicker">Ofertă exclusivă</p>
          <h3 id="popupTitle">NU RATA OFERTELE NOASTRE!</h3>
          <p>Abonează-te la newsletter și fii primul care află despre reduceri, colecții noi și oferte exclusive Boutique Kastel.</p>
          <form class="popup-form">
            <input type="email" id="popupEmail" name="email" autocomplete="email" placeholder="Adresa ta de email" required>
            <label class="consent-check">
              <input type="checkbox" id="popupConsent" required>
              <span>Sunt de acord ca adresa mea de e-mail să fie prelucrată pentru a primi acest newsletter, conform <a href="confidentialitate.html" target="_blank" rel="noopener">Politicii de confidențialitate</a>.</span>
            </label>
            <button type="submit" class="btn btn-gold">Abonează-te</button>
          </form>
          <p class="popup-note">Fără spam. Te poți dezabona oricând.</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function init() {
    const overlay = buildPopup();
    const closeBtn = overlay.querySelector('.popup-close');
    const form = overlay.querySelector('.popup-form');
    const popupBody = overlay.querySelector('.popup-body');

    function close() {
      overlay.hidden = true;
      markShown();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) close();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      popupBody.innerHTML = `
        <p class="popup-kicker kicker">Ofertă exclusivă</p>
        <p class="popup-confirm">Mulțumim! Vei fi primul care află despre ofertele noastre.</p>
      `;
      markShown();
      setTimeout(close, 2200);
    });

    setTimeout(() => {
      overlay.hidden = false;
      markShown();
    }, 7000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
