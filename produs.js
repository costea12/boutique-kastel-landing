function formatPrice(p) {
  return p != null ? `${p.toFixed(2).replace('.', ',')} Lei` : '';
}

const CATEGORY_PAGES = { PRF: 'parfumuri.html', ALC: 'bauturi.html', DLC: 'dulciuri.html' };
function categoryPage(category, niche) {
  if (category === 'PRF' && niche) return 'parfumuri-niche.html';
  return CATEGORY_PAGES[category] || 'index.html';
}
function categoryLabel(p) {
  if (p.category === 'PRF' && p.niche) return 'Parfumuri Niche';
  return p.category_label || '';
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

const DLC_TYPE_WORDS = new Set([
  'Acadele', 'Bomboane', 'Jeleuri', 'Jeleuiri', 'Biscuiti', 'Biscuti', 'Napolitane',
  'Caramele', 'Ceai', 'Crema', 'Budinca', 'Drajeuri', 'Foietaj', 'Fursecuri', 'Guma',
  'Trufe', 'Marshmallow', 'Mousse', 'Muffin', 'Prajitura', 'Sirop', 'Popcorn',
  'Creioane', 'Dropsuri', 'Praline', 'Batoane', 'Ciocolata', 'Alune',
]);

function getDlcType(name) {
  const first = name.split(' ')[0];
  return DLC_TYPE_WORDS.has(first) ? first : null;
}

function getWeight(name) {
  const m = name.match(/(\d+(?:[.,]\d+)?)\s*(gr|kg)\b/i);
  if (!m) return null;
  const val = m[1].replace(',', '.');
  return `${val} ${m[2].toUpperCase()}`;
}

function renderDlcSpecs(p) {
  const facts = [
    ['Tip', getDlcType(p.name)],
    ['Producător', p.brand],
    ['Greutate', getWeight(p.name)],
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

// ---------- Fallback description for perfumes without one in the catalog ----------
// We don't have real note pyramids/fragrance-family data for most SKUs, so this never
// invents specific scent claims - it only uses facts already derivable from the name
// (brand, gender cue, concentration) to produce honest, varied copy.
function detectGender(name) {
  const n = name.toLowerCase();
  if (/\bunisex\b/.test(n)) return 'unisex';
  if (/\b(man|men|homme|him|barbati)\b/.test(n)) return 'men';
  if (/\b(women|woman|femme|her|lady|femei)\b/.test(n) || /\bw\b/.test(n)) return 'women';
  return 'unisex';
}
const GENDER_WORD = { men: 'bărbați', women: 'femei', unisex: 'el și ea' };

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// "apă de parfum/toaletă/colonie" is feminine in Romanian ("această"), "extract de
// parfum" is neuter/masculine ("acest") - build the correctly-gendered noun phrase
// once instead of gluing "Acest"/"Această" onto a lowercased label.
const CONCENTRATION_PHRASE = {
  'Apă de parfum': 'Această apă de parfum',
  'Apă de toaletă': 'Această apă de toaletă',
  'Apă de colonie': 'Această apă de colonie',
  'Extract de parfum': 'Acest extract de parfum',
};
function concentrationPhrase(name) {
  const label = getConcentrationLabel(name);
  return (label && CONCENTRATION_PHRASE[label]) || 'Acest parfum';
}
// "Această apă ..." is feminine, "Acest parfum/extract" is masculine/neuter - pick the
// matching adjective ending so "gândit(ă)"/"neobservat(ă)" agree with the noun phrase.
function agree(cp, masc, fem) {
  return cp.startsWith('Această') ? fem : masc;
}

const MAINSTREAM_DESC_TEMPLATES = [
  (b, g, cp) => `${b} este unul dintre numele consacrate ale parfumeriei internaționale. ${cp}, ${agree(cp, 'gândit', 'gândită')} pentru ${g}, păstrează eleganța clasică pentru care brandul este cunoscut.`,
  (b, g, cp) => `O compoziție semnată ${b}, potrivită pentru ${g}, la fel de bună pentru purtat zilnic cât și pentru ocazii speciale.`,
  (b, g, cp) => `${b} rămâne una dintre casele de parfumerie preferate la nivel internațional. ${cp} este alegerea potrivită pentru ${g} care caută un miros rafinat, fără compromisuri.`,
  (b, g, cp) => `Parte din colecția ${b}, acest parfum pentru ${g} aduce eleganța și rafinamentul unui brand recunoscut la nivel mondial, la un preț corect.`,
  (b, g, cp) => `${b} este o alegere sigură atunci când vrei un parfum de calitate. ${cp} este ${agree(cp, 'gândit', 'gândită')} pentru ${g}.`,
];
const NICHE_DESC_TEMPLATES = [
  (b, g, cp) => `${b} este una dintre casele de parfumerie de nișă apreciate de cunoscători, cu compoziții intense și distinctive. ${cp} pentru ${g} nu trece ${agree(cp, 'neobservat', 'neobservată')}.`,
  (b, g, cp) => `Un parfum de nișă semnat ${b}, gândit pentru ${g} care caută ceva diferit de parfumeria de masă, o compoziție cu personalitate puternică.`,
  (b, g, cp) => `${b} construiește parfumuri de nișă cu concentrații ridicate și ingrediente premium. ${cp} este alegerea ideală pentru ${g} pasionați de parfumerie exclusivistă.`,
  (b, g, cp) => `Din segmentul parfumeriei de nișă, ${b} propune o compoziție rafinată pentru ${g}, cu o amprentă olfactivă memorabilă.`,
];

function generatePerfumeDescription(p) {
  const gender = GENDER_WORD[detectGender(p.name)];
  const cp = concentrationPhrase(p.name);
  const templates = p.niche ? NICHE_DESC_TEMPLATES : MAINSTREAM_DESC_TEMPLATES;
  const idx = hashCode(p.cod) % templates.length;
  return templates[idx](p.brand, gender, cp);
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
  if (p.category === 'DLC') return renderDlcSpecs(p);

  const description = p.description || generatePerfumeDescription(p);

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

      ${description ? `<p class="product-description">${description}</p>` : ''}

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
        <p class="product-category">${categoryLabel(p)}</p>
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

        <a href="${categoryPage(p.category, p.niche)}" class="back-link">← Înapoi la ${categoryLabel(p) || 'catalog'}</a>
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

  const sameCategory = data.filter((p) => p.cod !== product.cod && p.category === product.category
    && (product.category !== 'PRF' || Boolean(p.niche) === Boolean(product.niche)));
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
