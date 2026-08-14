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
const RECOMMENDED_CODES = [
  '3348901428545', // Dior Sauvage EDP 200ml
  '3145891165203', // Chanel Coco Mademoiselle EDP 100ml
  '3365440787919', // Ysl Black Opium EDP 50ml
  '888066000079',  // Tom Ford Black Orchid EDP 100ml
  '8011003809219', // Versace Eros EDT 100ml
];

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
      const byCode = Object.fromEntries(data.map((p) => [p.cod, p]));
      const picks = RECOMMENDED_CODES.map((c) => byCode[c]).filter(Boolean);
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
