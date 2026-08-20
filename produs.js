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

// ---------- Scent family for well-known fragrances ----------
// We don't have a real notes database for this catalog, so instead of inventing top/
// heart/base pyramids for 800+ SKUs, this only covers fragrance lines well-known and
// documented enough that we're confident about their general olfactory family. Matched
// by brand + a keyword from the actual fragrance line name. Anything not in this list
// (mostly lesser-known variants and regional brands) intentionally gets no scent claim.
const FRAGRANCE_FAMILY_RULES = [
  ['Amouage', /interlude/i, 'oriental, fumuriu, tămâie și scorțișoară'],
  ['Ariana Grande', /candy/i, 'gourmand, dulce, fructat'],
  ['Armaf', /club de nuit/i, 'fructat, lemnos, afumat'],
  ['Azzaro', /most wanted/i, 'condimentat, gourmand, cacao'],
  ['Azzaro', /chrome/i, 'acvatic, citrice, proaspăt'],
  ['Bottega Veneta', /knot/i, 'floral, catifelat'],
  ['Burberry', /goddess/i, 'floral, gourmand, vanilie'],
  ['Burberry', /\bher\b/i, 'fructat, floral, boabe roșii'],
  ['Burberry', /hero/i, 'lemnos, aromatic, citrice'],
  ['Burberry', /mr\.?\s?burberry/i, 'lemnos, aromatic, cedru'],
  ['Bvlgari', /aqua pour homme/i, 'acvatic, proaspăt, marin'],
  ['Bvlgari', /man in black/i, 'oriental, condimentat, tutun'],
  ['Bvlgari', /pour homme/i, 'citrice, verde, ceai'],
  ['Bvlgari', /patchouli/i, 'floral, patchouli'],
  ['Bvlgari', /tubereuse/i, 'floral, tuberoză'],
  ['By Kilian', /angels?.?\s?share/i, 'gourmand, cognac, vanilie'],
  ['Cacharel', /amor amor/i, 'fructat, floral'],
  ['Cacharel', /eden/i, 'fructat, oriental'],
  ['Cacharel', /noa/i, 'floral, proaspăt'],
  ['Calvin Klein', /eternity/i, 'floral, aromatic'],
  ['Calvin Klein', /euphoria/i, 'floral, oriental, rodie'],
  ['Calvin Klein', /\bck one\b|\bone shock\b/i, 'citrice, proaspăt, unisex'],
  ['Calvin Klein', /defy/i, 'aromatic, proaspăt'],
  ['Carolina Herrera', /good girl/i, 'floral, oriental, cacao'],
  ['Carolina Herrera', /bad boy/i, 'lemnos, condimentat, cacao'],
  ['Carolina Herrera', /212/i, 'fructat, oriental'],
  ['Carolina Herrera', /bomba/i, 'floral, oriental, tuberoză'],
  ['Chanel', /no\s?5/i, 'floral, pudrat, aldehide'],
  ['Chanel', /bl[eu]e? de chanel/i, 'lemnos, aromatic, citrice'],
  ['Chanel', /coco mademoiselle/i, 'oriental, floral, patchouli'],
  ['Chanel', /coco noir/i, 'oriental, floral, tămâie'],
  ['Chanel', /chance/i, 'floral, fructat'],
  ['Chanel', /allure/i, 'floral, ambrat'],
  ['Chanel', /gabrielle/i, 'floral, alb'],
  ['Chloe', /nomade/i, 'floral, chypre'],
  ['Chloe', /woman|signature|^chloe$/i, 'floral, pudrat'],
  ['Coach', /floral/i, 'floral'],
  ['Davidoff', /cool water/i, 'acvatic, aromatic, proaspăt'],
  ['Dior', /sauvage/i, 'proaspăt, condimentat, ambrat'],
  ['Dior', /fahrenheit/i, 'lemnos, piele, violete'],
  ['Dior', /\bhomme\b/i, 'lemnos, iris'],
  ['Dior', /j.?adore/i, 'floral, fructat'],
  ['Dior', /miss dior/i, 'floral, chypre'],
  ['Dior', /hypnotic poison/i, 'oriental, vanilie, migdale'],
  ['Dolce & Gabbana', /light blue/i, 'citrice, proaspăt, mediteranean'],
  ['Dolce & Gabbana', /the one|only one/i, 'oriental, condimentat'],
  ['Dolce & Gabbana', /\bk\b/i, 'aromatic, lemnos'],
  ['Elie Saab', /girl of now/i, 'gourmand, floral, fistic'],
  ['Elie Saab', /^elie saab le$/i, 'floral, alb, portocal'],
  ['Emporio Armani', /stronger with you/i, 'oriental, condimentat, vanilie'],
  ['Franck Boclet', /cocaine/i, 'gourmand, vanilie, ambrat'],
  ['Giorgio Armani', /acqua di gio/i, 'acvatic, citrice, marin'],
  ['Giorgio Armani', /\bsi\b/i, 'fructat, chypre, coacăze'],
  ['Giorgio Armani', /code/i, 'oriental, condimentat'],
  ['Giorgio Armani', /my way/i, 'floral, alb, tuberoză'],
  ['Giorgio Armani', /stronger with you/i, 'oriental, condimentat, vanilie'],
  ['Givenchy', /l.?interdit/i, 'floral, alb, tuberoză'],
  ['Givenchy', /gentleman/i, 'lemnos, aromatic'],
  ['Givenchy', /irresistible/i, 'floral, trandafir'],
  ['Gucci', /bloom/i, 'floral, alb'],
  ['Gucci', /bamboo/i, 'floral, lemnos'],
  ['Gucci', /guilty/i, 'oriental, floral'],
  ['Guerlain', /mon guerlain/i, 'floral, aromatic, lavandă'],
  ['Guerlain', /petite robe noire/i, 'fructat, gourmand, cireșe'],
  ['Hermes', /terre d.?hermes/i, 'lemnos, mineral, vetiver'],
  ['Hermes', /h24/i, 'aromatic, proaspăt'],
  ['Hermes', /twilly/i, 'floral, condimentat, ghimbir'],
  ['Hugo Boss', /bottled/i, 'lemnos, aromatic, măr'],
  ['Hugo Boss', /the scent/i, 'condimentat, piele'],
  ['Hugo Boss', /hugo (man|women)/i, 'aromatic, proaspăt'],
  ['Issey Miyake', /l.?eau d.?issey/i, 'acvatic, floral'],
  ['Jean Paul Gaultier', /le male/i, 'aromatic, lavandă, vanilie'],
  ['Jean Paul Gaultier', /scandal/i, 'gourmand, floral, miere'],
  ['Jean Paul Gaultier', /la belle/i, 'gourmand, floral, pară'],
  ['Jimmy Choo', /rose passion/i, 'floral, trandafir'],
  ['Jimmy Choo', /^jimmy choo$/i, 'floral, fructat, pară'],
  ['Joop', /homme/i, 'oriental, condimentat, vanilie'],
  ['Karl Lagerfeld', /vetiver/i, 'lemnos, vetiver'],
  ['Lacoste', /blanc|original/i, 'aromatic, proaspăt, citrice'],
  ['Lancome', /idole/i, 'floral, mosc, vanilie'],
  ['Lancome', /\blvb\b|vie est belle/i, 'gourmand, floral, iris'],
  ['Mancera', /aoud/i, 'oud, lemnos'],
  ['Mancera', /cedrat/i, 'citrice, lemnos'],
  ['Mancera', /coco vanille/i, 'gourmand, nucă de cocos, vanilie'],
  ['Mancera', /red tobacco/i, 'tutun, condimentat'],
  ['Mancera', /silver blue/i, 'proaspăt, acvatic'],
  ['Mancera', /tonka cola/i, 'gourmand, tonka'],
  ['Montale', /black aoud/i, 'oud, trandafir, lemnos'],
  ['Montale', /intense cafe/i, 'gourmand, cafea'],
  ['Montale', /mukhallat/i, 'oriental, oud'],
  ['Montblanc', /legend/i, 'aromatic, lemnos'],
  ['Montblanc', /explorer/i, 'lemnos, piele'],
  ['Narciso Rodriguez', /musc/i, 'mosc, floral'],
  ['Narciso Rodriguez', /all of me/i, 'mosc, lemnos'],
  ['Nasomatto', /black afgano/i, 'rășinos, oud, intens'],
  ['Nina', /nina ricci/i, 'fructat, floral, măr'],
  ['Nishane', /hacivat/i, 'fructat, gourmand, fistic'],
  ['Paco Rabanne', /1 mill?ion|million/i, 'condimentat, piele, scorțișoară'],
  ['Paco Rabanne', /invictus/i, 'marin, lemnos'],
  ['Paco Rabanne', /lady million/i, 'floral, fructat, zmeură'],
  ['Paco Rabanne', /olympea/i, 'oriental, vanilie, sărat'],
  ['Prada', /paradoxe/i, 'floral, mosc, chihlimbar'],
  ['Prada', /luna rossa/i, 'aromatic, proaspăt'],
  ['Salvatore Ferragamo', /signorina/i, 'fructat, floral, gourmand'],
  ['Shiseido', /ginza/i, 'floral, oriental'],
  ['Shiseido', /zen/i, 'floral, lemnos'],
  ['Thierry Mugler', /alien/i, 'floral, lemnos, chihlimbar'],
  ['Thierry Mugler', /angel/i, 'gourmand, oriental, ciocolată'],
  ['Thierry Mugler', /\ba\s?men\b/i, 'gourmand, ciocolată, patchouli'],
  ['Thierry Mugler', /aura/i, 'floral, gourmand, fructat'],
  ['Tom Ford', /black orchid/i, 'oriental, floral întunecat, trufe'],
  ['Tom Ford', /tobacco vanille/i, 'tutun, vanilie, oriental'],
  ['Tom Ford', /neroli portofino/i, 'citrice, neroli, proaspăt'],
  ['Tom Ford', /noir/i, 'oriental, condimentat, lemnos'],
  ['Tom Ford', /velvet orchid/i, 'floral, oriental, miere'],
  ['Tom Ford', /cafe rose/i, 'gourmand, trandafir, cafea'],
  ['Tom Ford', /tobacco oud/i, 'tutun, oud, lemnos'],
  ['Valentino', /born in roma/i, 'ambrat, floral'],
  ['Versace', /^versace eros/i, 'aromatic, oriental, vanilie'],
  ['Versace', /bright crystal/i, 'floral, fructat'],
  ['Versace', /crystal noir/i, 'oriental, floral, mosc'],
  ['Versace', /dylan blue/i, 'aromatic, acvatic'],
  ['Viktor & Rolf', /flower\s?bomb/i, 'floral, gourmand, patchouli'],
  ['Viktor & Rolf', /spice\s?bomb/i, 'condimentat, lemnos, tutun'],
  ['Xerjoff', /erba pura/i, 'fructat, gourmand, vanilie'],
  ['Xerjoff', /naxos/i, 'gourmand, tutun, miere'],
  ['Xerjoff', /accento/i, 'fructat, floral'],
  ['Xerjoff', /alexandria/i, 'oriental, chihlimbar, șofran'],
  ['Xerjoff', /more than words/i, 'floral, mosc'],
  ['Yves Saint Laurent', /black opium/i, 'gourmand, cafea, vanilie'],
  ['Yves Saint Laurent', /libre/i, 'floral, aromatic, lavandă'],
  ['Yves Saint Laurent', /mon paris/i, 'fructat, floral'],
  ['Yves Saint Laurent', /\by\b/i, 'aromatic, proaspăt'],
  ['Zadig & Voltaire', /this is him/i, 'lemnos, condimentat, piele'],
];

function getFragranceFamily(p) {
  for (const [brand, re, family] of FRAGRANCE_FAMILY_RULES) {
    if (p.brand === brand && re.test(p.name)) return family;
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
  let text = templates[idx](p.brand, gender, cp);
  const family = p.family || getFragranceFamily(p);
  if (family) text += ` Notă olfactivă: ${family}.`;
  return text;
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
    ['Miros', p.family || getFragranceFamily(p)],
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
