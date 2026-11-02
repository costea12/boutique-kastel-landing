let PRODUCTS = [];
let selectedBrands = new Set();
let activeTipFilter = null; // { slug, label, re } - set from a mega-menu link (?tip=), not a user-toggled UI filter
const PAGE_CATEGORY = document.body.dataset.category || null;
const PAGE_NICHE = document.body.dataset.niche || null; // "true" = niche only, "false" = mainstream only, unset = both

// Word-boundary product-type keywords per category, used by the header mega
// menu (?tip=slug) so clicking "Whisky" shows only whisky, not a fuzzy
// substring match that would also catch unrelated names (plain fuzzyMatch
// matched "Vol." for "vin" and "Romagna" for "rom" - too loose for this).
const TIP_FILTERS = {
  ALC: {
    vin: { label: 'Vin', re: /\bvin\b/ },
    whisky: { label: 'Whisky', re: /\bwhisk(e)?y\b/ },
    vodca: { label: 'Vodcă', re: /\bvod(c|k)a\b/ },
    rom: { label: 'Rom', re: /\brom\b/ },
    gin: { label: 'Gin', re: /\bgin\b/ },
    lichior: { label: 'Lichior', re: /\blichior/ },
    spumant: { label: 'Spumant & Șampanie', re: /\b(spumant|sampanie|prosecco)/ },
    bere: { label: 'Bere', re: /\bbere\b/ },
    coniac: { label: 'Coniac & Brandy', re: /\b(coniac|cognac|brandy)\b/ },
    tequila: { label: 'Tequila', re: /\btequila\b/ },
    // The catalog's "brand" field is unreliable for ALC (parsed wrong on
    // import, e.g. "Jack" instead of "Jack Daniel's") - these go by name
    // instead, same word-boundary approach as the type filters above.
    jack: { label: "Jack Daniel's", re: /jack daniel/ },
    hennessy: { label: 'Hennessy', re: /\bhennessy\b/ },
    martini: { label: 'Martini', re: /\bmartini\b/ },
    jagermeister: { label: 'Jägermeister', re: /jagermeister/ },
    chivas: { label: 'Chivas Regal', re: /\bchivas\b/ },
    moet: { label: 'Moët & Chandon', re: /\bmoet\b/ },
    aperol: { label: 'Aperol', re: /\baperol\b/ },
    bacardi: { label: 'Bacardi', re: /\bbacardi\b/ },
  },
  DLC: {
    ciocolata: { label: 'Ciocolată', re: /\bciocolata\b/ },
    praline: { label: 'Praline', re: /\bpraline\b/ },
    jeleuri: { label: 'Jeleuri', re: /\bjeleuri\b/ },
    biscuiti: { label: 'Biscuiți', re: /\bbiscuiti\b/ },
    bomboane: { label: 'Bomboane', re: /\bbomboane\b/ },
    napolitane: { label: 'Napolitane', re: /\bnapolitane\b/ },
    caramele: { label: 'Caramele', re: /\bcaramele\b/ },
  },
  CAF: {
    boabe: { label: 'Cafea boabe', re: /\bboabe\b/ },
    macinata: { label: 'Cafea măcinată', re: /\bmacinata\b/ },
  },
  ICP: {
    'gel-dus': { label: 'Gel de duș', re: /gel dus/ },
    'crema-corp': { label: 'Cremă de corp', re: /crema de corp/ },
    deo: { label: 'Deodorant', re: /\bdeo\b/ },
    'ulei-corp': { label: 'Ulei de corp', re: /ulei de corp/ },
  },
};

function normalizeDiacritics(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// normalizeText/fuzzyMatch/formatPrice etc. now live in search-utils.js
// (loaded before this file), shared with header-search.js's suggestions.

// Romania's SGR (Sistem Garanție-Returnare) deposit - flat 0,50 Lei per
// returnable container (PET/glass/metal, 0.1-3L). Products carrying it have
// "SGR" in their product name in the real POS data, which is how we detect it.
function sgrPriceLine(name) {
  return /\bSGR\b/i.test(name) ? '<span class="sgr-note">+ 0,50 Lei garanție SGR</span>' : '';
}

// Most bottles/cans in the real data are labeled in liters ("0.7l"), not
// milliliters - the lookahead (instead of \b) is needed because names like
// "0.7l40% SGR" have no space/boundary between the unit and the next number.
function getUnitPrice(name, price) {
  if (price == null) return null;
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|cl|gr|kg)(?=[^a-zA-Z]|$)/i);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(',', '.'));
  const unit = match[2].toLowerCase();

  // Perfumes are labeled in ml (75ml, 100ml) - a Lei/L figure on those would
  // read in the thousands and be meaningless to compare at a glance, so show
  // Lei/ml directly instead; liter/centiliter bottles (drinks) keep Lei/L.
  if (unit === 'ml') {
    return `${(price / amount).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lei/ml`;
  }
  if (unit === 'l' || unit === 'cl') {
    const liters = unit === 'cl' ? amount / 100 : amount;
    return `${Math.round(price / liters).toLocaleString('ro-RO')} Lei/L`;
  }
  const kg = unit === 'gr' ? amount / 1000 : amount;
  return `${Math.round(price / kg).toLocaleString('ro-RO')} Lei/Kg`;
}

function renderGrid(products) {
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  grid.innerHTML = products.map((p) => `
    <a class="product-card" href="produs.html?cod=${encodeURIComponent(p.cod)}">
      <div class="product-card-img">
        <img src="${p.bottle_image}" alt="${p.name}" loading="lazy">
        ${p.stock <= 0 ? '<span class="stock-badge out">Stoc epuizat</span>' : ''}
        ${window.favoriteButtonHtml ? window.favoriteButtonHtml(p.cod) : ''}
      </div>
      <span class="product-brand">${p.brand}</span>
      <h3>${p.name}</h3>
      <span class="product-price">${formatPrice(p.price)}</span>
      ${getUnitPrice(p.name, p.price) ? `<span class="product-unit-price-sm">${getUnitPrice(p.name, p.price)}</span>` : ''}
      ${sgrPriceLine(p.name)}
    </a>
  `).join('');
  if (window.syncFavoriteHearts) window.syncFavoriteHearts();
}

function categoryProducts() {
  let list = PAGE_CATEGORY ? PRODUCTS.filter((p) => p.category === PAGE_CATEGORY) : PRODUCTS;
  if (PAGE_NICHE === 'true') list = list.filter((p) => p.niche === true);
  else if (PAGE_NICHE === 'false') list = list.filter((p) => p.niche !== true);
  return list;
}

function buildBrandList() {
  const counts = {};
  categoryProducts().forEach((p) => { counts[p.brand] = (counts[p.brand] || 0) + 1; });
  const brands = Object.keys(counts).sort((a, b) => a.localeCompare(b));

  const container = document.getElementById('brandList');
  if (!container) return;

  container.innerHTML = brands.map((b) => `
    <label class="filter-checkbox brand-item">
      <input type="checkbox" value="${b}" class="brand-checkbox">
      <span>${b}</span>
      <span class="brand-count">${counts[b]}</span>
    </label>
  `).join('');

  container.querySelectorAll('.brand-checkbox').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedBrands.add(cb.value);
      else selectedBrands.delete(cb.value);
      applyFilters();
    });
  });
}

function filterBrandList() {
  const q = (document.getElementById('brandSearch')?.value || '').trim().toLowerCase();
  document.querySelectorAll('.brand-item').forEach((el) => {
    const label = el.textContent.toLowerCase();
    el.style.display = !q || label.includes(q) ? '' : 'none';
  });
}

function countActiveFilters() {
  let n = selectedBrands.size;
  if (document.getElementById('priceMin')?.value) n++;
  if (document.getElementById('priceMax')?.value) n++;
  if (document.getElementById('inStockOnly')?.checked) n++;
  return n;
}

function updateFilterBadge() {
  const badge = document.getElementById('filterActiveBadge');
  if (!badge) return;
  const n = countActiveFilters();
  badge.textContent = n;
  badge.hidden = n === 0;
}

function applyFilters() {
  const q = (document.getElementById('searchBox')?.value || '').trim().toLowerCase();
  const priceMin = parseFloat(document.getElementById('priceMin')?.value);
  const priceMax = parseFloat(document.getElementById('priceMax')?.value);
  const inStockOnly = document.getElementById('inStockOnly')?.checked;
  const sortBy = document.getElementById('sortSelect')?.value || 'name-asc';

  let filtered = categoryProducts().filter((p) => {
    if (q && !fuzzyMatch(q, p.name) && !fuzzyMatch(q, p.brand)) return false;
    if (activeTipFilter && !activeTipFilter.re.test(normalizeDiacritics(p.name))) return false;
    if (selectedBrands.size > 0 && !selectedBrands.has(p.brand)) return false;
    if (!isNaN(priceMin) && p.price != null && p.price < priceMin) return false;
    if (!isNaN(priceMax) && p.price != null && p.price > priceMax) return false;
    if (inStockOnly && p.stock <= 0) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'price-asc') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
    return a.name.localeCompare(b.name);
  });

  const subtitle = document.getElementById('catalogSubtitle');
  if (subtitle) subtitle.textContent = activeTipFilter ? `${filtered.length} produse · ${activeTipFilter.label}` : `${filtered.length} produse`;

  updateFilterBadge();
  renderGrid(filtered);
}

function toggleFiltersPanel() {
  const panel = document.getElementById('filtersPanel');
  const btn = document.getElementById('filterToggle');
  if (!panel) return;
  const isOpen = !panel.hidden;
  panel.hidden = isOpen;
  btn?.classList.toggle('open', !isOpen);
}

function clearFilters() {
  document.getElementById('searchBox').value = '';
  document.getElementById('priceMin').value = '';
  document.getElementById('priceMax').value = '';
  document.getElementById('inStockOnly').checked = false;
  document.getElementById('brandSearch').value = '';
  selectedBrands.clear();
  document.querySelectorAll('.brand-checkbox').forEach((cb) => { cb.checked = false; });
  activeTipFilter = null;
  filterBrandList();
  applyFilters();
}

// Prefill from a header-search redirect (e.g. parfumuri.html?q=eros) landing here
// from a page that has no catalog of its own.
const urlParams = new URLSearchParams(window.location.search);
const initialQuery = urlParams.get('q');
if (initialQuery) {
  const searchBoxEl = document.getElementById('searchBox');
  if (searchBoxEl) searchBoxEl.value = initialQuery;
}
// Mega-menu links land here as ?tip=slug or ?brand=Name to jump straight
// into a pre-filtered view instead of the full category.
const initialTipSlug = urlParams.get('tip');
const initialBrand = urlParams.get('brand');
if (initialTipSlug && PAGE_CATEGORY && TIP_FILTERS[PAGE_CATEGORY] && TIP_FILTERS[PAGE_CATEGORY][initialTipSlug]) {
  activeTipFilter = TIP_FILTERS[PAGE_CATEGORY][initialTipSlug];
}

fetch('catalog.json')
  .then((r) => r.json())
  .then((data) => applyProductOverrides(data))
  .then((data) => {
    PRODUCTS = data;
    buildBrandList();
    if (initialBrand) {
      const cb = document.querySelector(`.brand-checkbox[value="${CSS.escape(initialBrand)}"]`);
      if (cb) { cb.checked = true; selectedBrands.add(initialBrand); }
    }
    applyFilters();
  })
  .catch(() => {
    const subtitle = document.getElementById('catalogSubtitle');
    if (subtitle) subtitle.textContent = 'Catalogul nu a putut fi încărcat.';
  });

document.getElementById('searchBox')?.addEventListener('input', applyFilters);
document.getElementById('priceMin')?.addEventListener('input', applyFilters);
document.getElementById('priceMax')?.addEventListener('input', applyFilters);
document.getElementById('inStockOnly')?.addEventListener('change', applyFilters);
document.getElementById('sortSelect')?.addEventListener('change', applyFilters);
document.getElementById('brandSearch')?.addEventListener('input', filterBrandList);
document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
document.getElementById('filterToggle')?.addEventListener('click', toggleFiltersPanel);
document.getElementById('applyFilters')?.addEventListener('click', toggleFiltersPanel);
