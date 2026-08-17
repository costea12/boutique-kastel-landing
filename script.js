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

// Promo carousel (homepage) - auto-advances, plus manual arrow/dot navigation
const promoTrack = document.getElementById('promoTrack');
if (promoTrack) {
  const slides = Array.from(promoTrack.querySelectorAll('.promo-slide'));
  const dotsWrap = document.getElementById('promoDots');
  let current = slides.findIndex((s) => s.classList.contains('is-active'));
  if (current < 0) current = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Produsul ${i + 1}`);
    if (i === current) dot.classList.add('is-active');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function render() {
    slides.forEach((s, i) => s.classList.toggle('is-active', i === current));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
  }

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    render();
    resetTimer();
  }

  document.getElementById('promoPrev')?.addEventListener('click', () => goTo(current - 1));
  document.getElementById('promoNext')?.addEventListener('click', () => goTo(current + 1));

  let timer;
  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 60000); // auto-advance every 60s
  }
  resetTimer();
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
          </div>
          <span class="product-brand">${p.brand}</span>
          <h3>${p.name}</h3>
          <span class="product-price">${formatPriceHome(p.price)}</span>
        </a>
      `).join('');
    })
    .catch(() => {});
}

// Newsletter form (visual only — will be wired to the n8n backend once it exists)
const newsletterForm = document.getElementById('newsletterForm');
const newsletterNote = document.getElementById('newsletterNote');

newsletterForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  newsletterNote.textContent = 'Mulțumim! Vei fi anunțat la lansare.';
  newsletterForm.reset();
});
