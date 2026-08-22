// Newsletter popup - shared across every page.
// Shows once, 7 seconds after the site is first opened (whichever page
// that happens to be), then stays quiet for the rest of that visit -
// using sessionStorage so it comes back fresh on a new visit/tab, but
// won't repeat while someone keeps browsing around the site.
(function () {
  const STORAGE_KEY = 'bkNewsletterPopupShown';
  let alreadyShownThisVisit = false;
  try { alreadyShownThisVisit = !!sessionStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (alreadyShownThisVisit) return;

  function markShown() {
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
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
