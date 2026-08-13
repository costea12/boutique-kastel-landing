function formatPrice(p) {
  return p != null ? `${p.toFixed(2).replace('.', ',')} Lei` : '';
}

const CATEGORY_PAGES = { PRF: 'parfumuri.html', ALC: 'bauturi.html' };
function categoryPage(category) {
  return CATEGORY_PAGES[category] || 'index.html';
}

const ALC_TYPE_WORDS = new Set([
  'Absinth', 'Aperitiv', 'Aperitive', 'Bere', 'Blonda', 'Bitter', 'Brandy', 'Champagne',
  'Cocktail', 'Cognac', 'Coniac', 'Digestiv', 'Gin', 'Lichior', 'Palinca', 'Prosecco',
  'Rachiu', 'Rom', 'Sampanie', 'Spumant', 'Tuica', 'Vermut', 'Vin', 'Vinuri', 'Votca',
  'Vodka', 'Whisky', 'Whiskey', 'Whisy',
]);

function getAlcType(name) {
  const first = name.split(' ')[0];
  return ALC_TYPE_WORDS.has(first) ? first : null;
}

function getVolume(name) {
  const m = name.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  if (!m) return null;
  const val = m[1].replace(',', '.');
  return `${val} ${m[2].toUpperCase()}`;
}

function getAbv(name) {
  const m = name.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? `${m[1].replace(',', '.')}%` : null;
}

function getUnitPrice(name, price) {
  if (price == null) return null;
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(ml|gr)\b/i);
  if (!match) return null;

  const volume = parseFloat(match[1].replace(',', '.'));
  const unit = match[2].toLowerCase();
  const perKilo = price / (volume / 1000);
  const formatted = Math.round(perKilo).toLocaleString('ro-RO');

  return unit === 'ml' ? `${formatted} Lei/L` : `${formatted} Lei/Kg`;
}

function getConcentrationLabel(name) {
  const labels = [
    [/\bEDP\b/i, 'Apă de parfum'],
    [/\bEDT\b/i, 'Apă de toaletă'],
    [/\bEDC\b/i, 'Apă de colonie'],
    [/\bCologne\b/i, 'Apă de colonie'],
    [/\bParfum\b/i, 'Extract de parfum'],
  ];
  for (const [re, label] of labels) {
    if (re.test(name)) return label;
  }
  return null;
}

function renderNoteTags(notes) {
  if (!notes) return '';
  return notes.split(',').map((n) => `<span class="note-tag">${n.trim()}</span>`).join('');
}

function renderAlcSpecs(p) {
  const facts = [
    ['Tip', getAlcType(p.name)],
    ['Producător', p.brand],
    ['Volum', getVolume(p.name)],
    ['Tărie alcoolică', getAbv(p.name)],
  ].filter(([, value]) => value);

  if (!p.description && !facts.length) return '';

  return `
    <div class="product-story">
      <div class="flourish story-flourish">
        <span class="line"></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 2c2 2.5 4 5.8 4 9a4 4 0 0 1-8 0c0-3.2 2-6.5 4-9Z"/></svg>
        <span class="line rev"></span>
      </div>

      ${p.description ? `<p class="product-description">${p.description}</p>` : ''}

      ${facts.length ? `
        <dl class="product-facts">
          ${facts.map(([label, value]) => `
            <div class="fact-item">
              <dt>${label}</dt>
              <dd>${value}</dd>
            </div>
          `).join('')}
        </dl>
      ` : ''}
    </div>
  `;
}

function renderSpecs(p) {
  if (p.category === 'ALC') return renderAlcSpecs(p);
  if (!p.description && !p.family) return '';

  const tiers = [
    ['Note de vârf', p.notes_top],
    ['Note de mijloc', p.notes_mid],
    ['Note de bază', p.notes_base],
  ].filter(([, value]) => value);

  const facts = [
    ['Miros', p.family],
    ['Zi/Noapte', p.mood],
    ['Sezonalitate', p.season],
    ['Tip parfum', getConcentrationLabel(p.name)],
    ['Gen', p.gender],
    ['An lansare', p.year],
  ].filter(([, value]) => value);

  return `
    <div class="product-story">
      <div class="flourish story-flourish">
        <span class="line"></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 2c2 2.5 4 5.8 4 9a4 4 0 0 1-8 0c0-3.2 2-6.5 4-9Z"/></svg>
        <span class="line rev"></span>
      </div>

      ${p.description ? `<p class="product-description">${p.description}</p>` : ''}

      ${tiers.length ? `
        <div class="notes-pyramid">
          ${tiers.map(([label, value]) => `
            <div class="notes-tier">
              <span class="notes-tier-label">${label}</span>
              <div class="notes-tags">${renderNoteTags(value)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${facts.length ? `
        <dl class="product-facts">
          ${facts.map(([label, value]) => `
            <div class="fact-item">
              <dt>${label}</dt>
              <dd>${value}</dd>
            </div>
          `).join('')}
        </dl>
      ` : ''}
    </div>
  `;
}

function renderProduct(p) {
  const main = document.getElementById('productMain');
  const images = [p.bottle_image, p.box_image].filter(Boolean);

  main.innerHTML = `
    <div class="product-detail">
      <div class="product-gallery">
        <div class="product-gallery-main">
          <img id="mainImg" src="${images[0]}" alt="${p.name}">
        </div>
        ${images.length > 1 ? `
          <div class="product-gallery-thumbs">
            ${images.map((img, i) => `
              <button class="thumb ${i === 0 ? 'active' : ''}" data-img="${img}">
                <img src="${img}" alt="${p.name} - imagine ${i + 1}">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="product-info">
        <p class="product-category">${p.category_label || ''}</p>
        <h1>${p.name}</h1>
        <p class="product-price">${formatPrice(p.price)}</p>
        ${getUnitPrice(p.name, p.price) ? `<p class="product-unit-price">${getUnitPrice(p.name, p.price)}</p>` : ''}
        <p class="product-stock ${p.stock > 0 ? 'in-stock' : 'out-of-stock'}">
          ${p.stock > 0 ? 'În stoc' : 'Stoc epuizat'}
        </p>

        <div class="product-qty">
          <label for="qty">Cantitate</label>
          <div class="qty-control">
            <button type="button" id="qtyMinus">−</button>
            <input type="number" id="qty" value="1" min="1" max="${Math.max(p.stock, 1)}">
            <button type="button" id="qtyPlus">+</button>
          </div>
        </div>

        <button class="btn btn-cart" id="addToCartBtn" ${p.stock <= 0 ? 'disabled' : ''}>
          ${p.stock > 0 ? 'Adaugă în coș' : 'Stoc epuizat'}
        </button>
        <p class="cart-confirm" id="cartConfirm" hidden>Adăugat în coș ✓</p>

        ${renderSpecs(p)}

        <a href="${categoryPage(p.category)}" class="back-link">← Înapoi la ${p.category_label || 'catalog'}</a>
      </div>
    </div>
  `;

  document.querySelectorAll('.thumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('mainImg').src = btn.dataset.img;
      document.querySelectorAll('.thumb').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const qtyInput = document.getElementById('qty');
  document.getElementById('qtyMinus')?.addEventListener('click', () => {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1') - 1);
  });
  document.getElementById('qtyPlus')?.addEventListener('click', () => {
    qtyInput.value = Math.min(p.stock || 99, parseInt(qtyInput.value || '1') + 1);
  });

  document.getElementById('addToCartBtn')?.addEventListener('click', () => {
    const qty = parseInt(qtyInput.value || '1');
    addToCart(p.cod, p.name, p.price, p.bottle_image, qty);
    const confirm = document.getElementById('cartConfirm');
    confirm.hidden = false;
    setTimeout(() => { confirm.hidden = true; }, 2500);
  });
}

function renderRelated(product, data) {
  const grid = document.getElementById('relatedGrid');
  const section = document.getElementById('relatedSection');
  if (!grid || !section) return;

  const sameCategory = data.filter((p) => p.cod !== product.cod && p.category === product.category);
  const sameBrand = sameCategory.filter((p) => p.brand === product.brand);
  const others = sameCategory.filter((p) => p.brand !== product.brand);

  const shuffled = (arr) => arr.slice().sort(() => Math.random() - 0.5);
  const picks = shuffled(sameBrand).slice(0, 5);
  if (picks.length < 5) picks.push(...shuffled(others).slice(0, 5 - picks.length));
  if (!picks.length) return;

  grid.innerHTML = picks.map((p) => `
    <a class="product-card" href="produs.html?cod=${encodeURIComponent(p.cod)}">
      <div class="product-card-img">
        <img src="${p.bottle_image}" alt="${p.name}" loading="lazy">
      </div>
      <span class="product-brand">${p.brand}</span>
      <h3>${p.name}</h3>
      <span class="product-price">${formatPrice(p.price)}</span>
    </a>
  `).join('');
  section.hidden = false;
}

const params = new URLSearchParams(window.location.search);
const cod = params.get('cod');

fetch('catalog.json')
  .then((r) => r.json())
  .then((data) => {
    const product = data.find((p) => p.cod === cod);
    if (!product) {
      document.getElementById('productMain').innerHTML = '<p class="product-loading">Produs negăsit. <a href="parfumuri.html">Înapoi la catalog</a></p>';
      return;
    }
    renderProduct(product);
    renderRelated(product, data);
  })
  .catch(() => {
    document.getElementById('productMain').innerHTML = '<p class="product-loading">Catalogul nu a putut fi încărcat.</p>';
  });
