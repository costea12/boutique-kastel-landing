// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach((el) => io.observe(el));

// Scroll-linked reveal - unlike .reveal above (which plays a fixed-length
// CSS transition once triggered), .reveal-scroll elements track scroll
// position directly: opacity/offset are recomputed on every scroll frame,
// so the text visibly fades in at the same speed you're scrolling.
//
// One-time-only rule: once an element reaches full opacity it's marked
// "settled" and never recomputed again - so scrolling back up and down
// past it later just shows it normally, no re-fade. This only plays out
// as a first-pass-down-the-page effect, not every time you scroll.
let scrollRevealPending = Array.from(document.querySelectorAll('.reveal-scroll'));
if (scrollRevealPending.length) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  function updateScrollReveal() {
    const vh = window.innerHeight;
    const start = vh * 0.88; // element top at 88% down the viewport -> progress 0
    const end = vh * 0.68;   // element top at 68% down the viewport -> progress 1
    scrollRevealPending = scrollRevealPending.filter((el) => {
      // A data-reveal-delay (in viewport-height fractions) staggers siblings
      // that sit at the same vertical position (e.g. two photos side by
      // side), which otherwise share the same scroll progress.
      const delay = parseFloat(el.dataset.revealDelay || '0') * vh;
      const top = el.getBoundingClientRect().top + delay;
      const progress = clamp((start - top) / (start - end), 0, 1);
      const y = (1 - progress) * 24;
      el.style.opacity = progress;
      el.style.transform = el.classList.contains('reveal-scroll-photo')
        ? `translateY(${y}px) scale(${0.94 + progress * 0.06})`
        : `translateY(${y}px)`;
      return progress < 1; // settled elements drop out and stay put
    });
    if (!scrollRevealPending.length) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollReveal);
    }
  }
  let ticking = false;
  var onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateScrollReveal(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateScrollReveal);
  updateScrollReveal();
}

// Mobile nav
const navToggle = document.getElementById('navToggle');
const navClose = document.getElementById('navClose');
const mobileNav = document.getElementById('mobileNav');
const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');

function openMobileNav() {
  mobileNav.classList.add('open');
  mobileNavBackdrop?.classList.add('open');
}
function closeMobileNav() {
  mobileNav.classList.remove('open');
  mobileNavBackdrop?.classList.remove('open');
}

navToggle?.addEventListener('click', openMobileNav);
navClose?.addEventListener('click', closeMobileNav);
mobileNavBackdrop?.addEventListener('click', closeMobileNav);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileNav(); });
mobileNav?.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', closeMobileNav)
);

// Highlight the current page's link in the sidebar
const currentPage = location.pathname.split('/').pop() || 'index.html';
mobileNav?.querySelectorAll('.mobile-nav-link').forEach((a) => {
  if (a.getAttribute('href') === currentPage) a.classList.add('is-active');
});

// Editorial spotlight "more products" rows (homepage only, one per category
// section - Parfumuri/Băuturi/Cafea/Dulciuri). On mobile each becomes its own
// one-card-at-a-time carousel that auto-advances every 30s and also responds
// to a left/right swipe, staying on a single line rather than stacking; on
// desktop all cards show at once as a static grid (CSS handles that side,
// this only runs the mobile rotation/swipe). Each section gets its own
// independent timer/index via the closure below.
document.querySelectorAll('.editorial-spotlight').forEach((section) => {
  const wrap = section.querySelector('.editorial-spotlight-more');
  const dotsWrap = section.querySelector('.editorial-spotlight-dots');
  if (!wrap || !dotsWrap) return;

  const cards = Array.from(wrap.querySelectorAll('.product-card'));
  if (cards.length < 2) return;

  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Produsul ${i + 1}`);
    dot.addEventListener('click', () => { current = i; render(); resetTimer(); });
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  let current = 0;
  function render() {
    cards.forEach((c, i) => c.classList.toggle('is-shown', i === current));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
  }

  let timer;
  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => { current = (current + 1) % cards.length; render(); }, 30000);
  }

  // Swipe: left goes to the next card, right goes to the previous one.
  // Only horizontal swipes trigger a change - a mostly-vertical drag (page
  // scroll) is ignored so scrolling past the section still works normally.
  let touchStartX = 0;
  let touchStartY = 0;
  wrap.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    current = dx < 0
      ? (current + 1) % cards.length
      : (current - 1 + cards.length) % cards.length;
    render();
    resetTimer();
  }, { passive: true });

  render();
  resetTimer();
});

// Live product count + recommended picks (homepage only)

// Seeded RNG (mulberry32) so the picks are stable all day but reshuffle the next day -
// seed comes from today's date, not the clock, so it doesn't change on every page load.
function seededRandom(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function todaySeed() {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  return hash;
}
function shuffledPick(arr, count, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// Picks a diversified daily selection: 5 products shuffled from across all categories
// (falls back to the full catalog if not enough in-stock items) instead of a fixed
// hand-picked list.
function pickDailyRecommended(data) {
  const rng = seededRandom(todaySeed());
  const inStock = data.filter((p) => p.stock > 0);
  const pool = inStock.length >= 5 ? inStock : data;
  return shuffledPick(pool, 5, rng);
}

function formatPriceHome(p) {
  return p != null ? `${p.toFixed(2).replace('.', ',')} Lei` : '';
}

function sgrPriceLineHome(name) {
  return /\bSGR\b/i.test(name) ? '<span class="sgr-note">+ 0,50 Lei garanție SGR</span>' : '';
}

function getUnitPriceHome(name, price) {
  if (price == null) return null;
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|cl|gr|kg)(?=[^a-zA-Z]|$)/i);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(',', '.'));
  const unit = match[2].toLowerCase();
  if (unit === 'ml' || unit === 'l' || unit === 'cl') {
    const liters = unit === 'ml' ? amount / 1000 : unit === 'cl' ? amount / 100 : amount;
    return `${Math.round(price / liters).toLocaleString('ro-RO')} Lei/L`;
  }
  const kg = unit === 'gr' ? amount / 1000 : amount;
  return `${Math.round(price / kg).toLocaleString('ro-RO')} Lei/Kg`;
}

if (document.getElementById('parfumCount') || document.getElementById('bauturiCount') || document.getElementById('recommendedGrid')) {
  fetch('catalog.json')
    .then((r) => r.json())
    .then((data) => {
      const countByCategory = (cat) => data.filter((p) => p.category === cat).length;

      const parfumCountEl = document.getElementById('parfumCount');
      if (parfumCountEl) parfumCountEl.textContent = `${countByCategory('PRF')} produse`;

      const bauturiCountEl = document.getElementById('bauturiCount');
      if (bauturiCountEl) bauturiCountEl.textContent = `${countByCategory('ALC')} produse`;

      const grid = document.getElementById('recommendedGrid');
      if (!grid) return;
      const picks = pickDailyRecommended(data);
      grid.innerHTML = picks.map((p) => `
        <a class="product-card" href="produs.html?cod=${encodeURIComponent(p.cod)}">
          <div class="product-card-img">
            <img src="${p.bottle_image}" alt="${p.name}" loading="lazy">
            ${window.favoriteButtonHtml ? window.favoriteButtonHtml(p.cod) : ''}
          </div>
          <span class="product-brand">${p.brand}</span>
          <h3>${p.name}</h3>
          <span class="product-price">${formatPriceHome(p.price)}</span>
          ${getUnitPriceHome(p.name, p.price) ? `<span class="product-unit-price-sm">${getUnitPriceHome(p.name, p.price)}</span>` : ''}
          ${sgrPriceLineHome(p.name)}
        </a>
      `).join('');
      if (window.syncFavoriteHearts) window.syncFavoriteHearts();
    })
    .catch(() => {});
}

// Newsletter form (visual only, will be wired to the n8n backend once it exists)
const newsletterForm = document.getElementById('newsletterForm');
const newsletterNote = document.getElementById('newsletterNote');

newsletterForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  newsletterNote.textContent = 'Mulțumim! Vei fi anunțat la lansare.';
  newsletterForm.reset();
});
