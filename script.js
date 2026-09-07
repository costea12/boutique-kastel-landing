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

// Fan carousel (homepage) - a hand of product cards fanned out around a
// center card, cycling 7-at-a-time through a longer product list. Plain
// CSS transforms/transitions - same visual idea as the GSAP card-fan-carousel
// component, no React/build step needed for this static site.
const fanTrack = document.getElementById('fanTrack');
if (fanTrack) {
  const cards = Array.from(fanTrack.querySelectorAll('.fan-card'));
  const total = cards.length;
  const MAX_VISIBLE = 7;
  const HALF = 3;
  const needsPagination = total > MAX_VISIBLE;

  // Angle/scale/offset per fan slot, mirroring the reference component.
  const FAN_POSITIONS = [
    { rot: -21, scale: 0.7756, x: -30, y: 7.3, z: 1 },
    { rot: -14, scale: 0.8498, x: -22, y: 4.0, z: 2 },
    { rot: -7,  scale: 0.9346, x: -11, y: 1.3, z: 3 },
    { rot: 0,   scale: 1.0,    x: 0,   y: 0.0, z: 10 },
    { rot: 7,   scale: 0.9346, x: 11,  y: 1.3, z: 3 },
    { rot: 14,  scale: 0.8498, x: 22,  y: 4.0, z: 2 },
    { rot: 21,  scale: 0.7756, x: 30,  y: 7.3, z: 1 },
  ];

  function responsiveMultiplier() {
    const w = window.innerWidth;
    if (w < 480) return 0.34;
    if (w < 640) return 0.46;
    if (w < 768) return 0.6;
    if (w < 1024) return 0.8;
    return 1.0;
  }

  let centerIndex = needsPagination ? HALF : total >> 1;

  function visibleMap() {
    const map = new Map();
    if (!needsPagination) {
      cards.forEach((_, i) => map.set(i, i));
      return map;
    }
    for (let slot = 0; slot < MAX_VISIBLE; slot++) {
      const idx = ((centerIndex + slot - HALF) % total + total) % total;
      map.set(idx, slot);
    }
    return map;
  }

  // Each card's current base (non-hover) transform pieces, so hover can
  // layer a lift + extra scale on top instead of overwriting x/y/rotate
  // (which is what caused the chaotic jump-to-center glitch on hover).
  const baseFor = new Map();

  // Hover only changes z-index and a CSS class (glow + caption, see
  // .fan-card.is-hovered in style.css) - it never touches the transform.
  // Moving/scaling the card under the cursor was what caused the vibration:
  // the card's edge would shift away from the pointer, firing mouseleave,
  // which reset it, which fired mouseenter again, looping rapidly.
  function applyTransform(card, base, hovered) {
    card.style.transform =
      `translate(-50%, -50%) translate(${base.x}rem, ${base.y}rem) rotate(${base.rot}deg) scale(${base.scale})`;
    card.style.zIndex = hovered ? '30' : String(base.z);
    card.classList.toggle('is-hovered', hovered);
  }

  function render() {
    const mult = responsiveMultiplier();
    const map = visibleMap();
    cards.forEach((card, i) => {
      const slot = map.get(i);
      if (slot === undefined) {
        card.style.opacity = '0';
        card.style.pointerEvents = 'none';
        card.style.transform = 'translate(-50%, -50%) scale(0.5)';
        card.style.zIndex = '0';
        baseFor.delete(card);
        return;
      }
      const p = FAN_POSITIONS[slot];
      const base = { x: p.x * mult, y: p.y * mult, rot: p.rot, scale: p.scale, z: p.z };
      baseFor.set(card, base);
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
      applyTransform(card, base, false);
    });
    dots.forEach((d, i) => d.classList.toggle('is-active', i === centerIndex));
  }

  function cycle(dir) {
    centerIndex = (centerIndex + dir + total) % total;
    render();
  }

  const dotsWrap = document.getElementById('fanDots');
  const dots = [];
  if (needsPagination) {
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', `Produsul ${i + 1}`);
      dot.addEventListener('click', () => { centerIndex = i; render(); });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });
  }

  document.getElementById('fanPrev')?.addEventListener('click', () => cycle(-1));
  document.getElementById('fanNext')?.addEventListener('click', () => cycle(1));
  window.addEventListener('resize', render);

  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      const base = baseFor.get(card);
      if (base) applyTransform(card, base, true);
    });
    card.addEventListener('mouseleave', () => {
      const base = baseFor.get(card);
      if (base) applyTransform(card, base, false);
    });
  });

  render();
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
