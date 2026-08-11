function formatPrice(p) {
  return p != null ? `${p.toFixed(2).replace('.', ',')} Lei` : '';
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

function renderSpecs(p) {
  if (!p.family) return '';

  const rows = [
    ['Miros', p.family],
    ['Zi/Noapte', p.mood],
    ['Note de vârf', p.notes_top],
    ['Note de mijloc', p.notes_mid],
    ['Note de bază', p.notes_base],
    ['Sezonalitate', p.season],
    ['Tip parfum', getConcentrationLabel(p.name)],
    ['Gen', p.gender],
    ['An lansare', p.year],
  ].filter(([, value]) => value);

  return `
    <div class="product-description-block">
      ${p.description ? `<p class="product-description">${p.description}</p>` : ''}
      <dl class="product-specs">
        ${rows.map(([label, value]) => `
          <div class="spec-row">
            <dt>${label}</dt>
            <dd>${value}</dd>
          </div>
        `).join('')}
      </dl>
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

        <a href="parfumuri.html" class="back-link">← Înapoi la Parfumuri</a>
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
  })
  .catch(() => {
    document.getElementById('productMain').innerHTML = '<p class="product-loading">Catalogul nu a putut fi încărcat.</p>';
  });
