let PRODUCTS = [];
let selectedBrands = new Set();
const PAGE_CATEGORY = document.body.dataset.category || null;
const PAGE_NICHE = document.body.dataset.niche || null; // "true" = niche only, "false" = mainstream only, unset = both

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

  if (unit === 'ml' || unit === 'l' || unit === 'cl') {
    const liters = unit === 'ml' ? amount / 1000 : unit === 'cl' ? amount / 100 : amount;
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
  if (subtitle) subtitle.textContent = `${filtered.length} produse`;

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
  filterBrandList();
  applyFilters();
}

// Prefill from a header-search redirect (e.g. parfumuri.html?q=eros) landing here
// from a page that has no catalog of its own.
const initialQuery = new URLSearchParams(window.location.search).get('q');
if (initialQuery) {
  const searchBoxEl = document.getElementById('searchBox');
  if (searchBoxEl) searchBoxEl.value = initialQuery;
}

fetch('catalog.json')
  .then((r) => r.json())
  .then((data) => {
    PRODUCTS = data;
    buildBrandList();
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
