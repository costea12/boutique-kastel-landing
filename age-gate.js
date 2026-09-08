// Age check for alcohol (Băuturi category is 100% alcoholic - whisky/vodka/
// rum/champagne/wine/beer etc). Doesn't block the whole site though: most of
// the catalog (parfumuri, dulciuri, cafea...) is perfectly fine for a minor
// to browse and buy, so "under 18" just gets remembered and used elsewhere
// (produs.js, cos.html) to block alcohol purchases specifically, instead of
// exiting them from the site entirely.
//
// window.bkIsMinor() is the shared helper other scripts use to check this.
(function () {
  const STORAGE_KEY = 'bkAgeVerified'; // '1' = confirmed 18+, '0' = confirmed under 18

  window.bkIsMinor = function () {
    try { return localStorage.getItem(STORAGE_KEY) === '0'; } catch (e) { return false; }
  };

  try {
    if (localStorage.getItem(STORAGE_KEY) !== null) return; // already answered, either way
  } catch (e) {
    // localStorage unavailable (private mode edge cases) - fail open rather
    // than permanently blocking a legitimate adult visitor every page load.
    return;
  }

  function build() {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay age-gate-overlay';
    overlay.innerHTML = `
      <div class="popup-card age-gate-card" role="dialog" aria-modal="true" aria-labelledby="ageGateTitle">
        <div class="popup-body">
          <p class="popup-kicker kicker">Boutique Kastel</p>
          <h3 id="ageGateTitle">Ai peste 18 ani?</h3>
          <p>Acest site conține și produse cu conținut alcoolic. Confirmă vârsta ta - restul catalogului (parfumuri, cafea, dulciuri etc.) rămâne disponibil oricum.</p>
          <div class="age-gate-actions">
            <button type="button" class="btn btn-gold" id="ageGateYes">Am peste 18 ani</button>
            <button type="button" class="btn btn-outline" id="ageGateNo">Am sub 18 ani</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('age-gate-lock');
    return overlay;
  }

  function init() {
    const overlay = build();

    overlay.querySelector('#ageGateYes').addEventListener('click', () => {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
      overlay.remove();
      document.body.classList.remove('age-gate-lock');
    });

    overlay.querySelector('#ageGateNo').addEventListener('click', () => {
      try { localStorage.setItem(STORAGE_KEY, '0'); } catch (e) {}
      overlay.remove();
      document.body.classList.remove('age-gate-lock');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
