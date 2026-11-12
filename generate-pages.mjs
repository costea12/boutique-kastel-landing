// Generates one static HTML page per product at produs/<slug>/index.html,
// plus sitemap.xml and the slug map, so Google sees each product's real
// title, description, price and markup in the raw HTML instead of the one
// shared, empty produs.html shell (which made Search Console flag the whole
// catalog as duplicates, 2026-11-09).
//
// The pages are produs.html with the product pre-rendered into it. They load
// the same produs.js, which re-renders with live data (Firestore stock/price/
// on-sale overrides from the admin panel) - so the admin panel keeps working
// exactly as before; the static HTML is only the starting state.
//
// Data = catalog.json + the admin panel's Firestore `products` overlay
// (public-read, fetched over REST), merged by the site's own
// product-overrides.js so both always agree. Products the owner adds from the
// admin panel get a page on the next run (GitHub Action, daily); until then
// they work at produs.html?cod=.
//
// Usage: node generate-pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SITE = 'https://kastelboutique.ro';
const FIREBASE_PROJECT = 'boutiq-kastel';
const OUT_DIR = 'produs';
const SLUG_MAP = path.join(OUT_DIR, 'slugs.json');

const STATIC_PAGES = [
  { url: '', priority: '1.0' },
  { url: 'parfumuri.html', priority: '0.8' },
  { url: 'parfumuri-niche.html', priority: '0.8' },
  { url: 'ingrijire-corporala.html', priority: '0.8' },
  { url: 'bauturi.html', priority: '0.8' },
  { url: 'dulciuri.html', priority: '0.8' },
  { url: 'cafea.html', priority: '0.8' },
  { url: 'despre-noi.html', priority: '0.5' },
  { url: 'contact.html', priority: '0.5' },
  { url: 'retur.html', priority: '0.3' },
  { url: 'termeni.html', priority: '0.3' },
  { url: 'confidentialitate.html', priority: '0.3' },
];

const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escXml = escAttr;

// ---------- 1. Firestore overlay (public read over REST) ----------

function decodeValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  return undefined;
}
function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

async function fetchOverrides() {
  const apiKey = (read('firebase-config.js').match(/apiKey:\s*"([^"]+)"/) || [])[1];
  const docs = [];
  let pageToken = '';
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/products`
      + `?pageSize=300${apiKey ? `&key=${apiKey}` : ''}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Firestore read failed: ${r.status} ${await r.text()}`);
    const j = await r.json();
    for (const d of j.documents || []) {
      docs.push({ id: decodeURIComponent(d.name.split('/').pop()), data: decodeFields(d.fields || {}) });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// Runs the site's own merge function from product-overrides.js, so the merge
// rules (what an override can change, isNew products, inactive filtering)
// can never drift from what the browser does.
function mergeWithOverrides(catalog, docs) {
  const ctx = { Promise, Object, Set };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('product-overrides.js'), ctx);
  return ctx.mergeProductOverrides(catalog, overridesMap(docs));
}
const overridesMap = (docs) => Object.fromEntries(docs.map((d) => [d.id, d.data]));

// ---------- 2. Slugs ----------

function slugify(name) {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' si ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');
}
const makeSlug = (p) => `${slugify(p.name) || 'produs'}-${slugify(p.cod)}`;

// ---------- 3. Pre-render with the site's own produs.js ----------

function makeRenderer() {
  const src = read('produs.js');
  const cut = src.indexOf('// ---- boot ----');
  if (cut < 0) throw new Error('produs.js boot marker not found');

  const captured = {};
  const el = (id) => ({
    set innerHTML(v) { captured[id] = v; },
    get innerHTML() { return captured[id] || ''; },
    setAttribute(name, value) { captured[`${id}@${name}`] = value; },
    set textContent(v) { captured[`${id}#text`] = v; },
    addEventListener() {},
    hidden: true,
  });
  const fakeDocument = {
    title: '',
    getElementById: (id) => el(id),
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => el('created'),
    head: { appendChild() {} },
  };
  const ctx = { document: fakeDocument, console, JSON, Math, Number, String, Boolean, Array, Object, Set, Map, RegExp, encodeURIComponent, parseInt, parseFloat, isNaN, Intl, Date, setTimeout: () => {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src.slice(0, cut), ctx);

  return (p) => {
    for (const k of Object.keys(captured)) delete captured[k];
    ctx.document.title = '';
    // getElementById('productJsonLd') returns a stub, so the JSON-LD text is
    // captured under 'productJsonLd#text'.
    ctx.renderProduct(p);
    return {
      main: captured.productMain || '',
      title: ctx.document.title,
      description: captured['metaDescription@content'] || '',
      canonical: captured['canonicalLink@href'] || '',
      jsonLd: captured['productJsonLd#text'] || '',
    };
  };
}

// ---------- 4. Page template ----------

function makeTemplate() {
  const html = read('produs.html');
  const loading = '<p class="product-loading">Se încarcă produsul...</p>';
  if (!html.includes(loading)) throw new Error('produs.html loading placeholder not found');
  if (!/<title>[^<]*<\/title>/.test(html)) throw new Error('produs.html <title> not found');
  return (p, r) => {
    const image = p.bottle_image ? `${SITE}/${p.bottle_image}` : `${SITE}/assets/hero/hero-masa-1600.jpg`;
    const head = [
      `<link rel="canonical" id="canonicalLink" href="${escAttr(r.canonical)}">`,
      `<meta name="product-cod" content="${escAttr(p.cod)}">`,
      `<meta property="og:type" content="product">`,
      `<meta property="og:site_name" content="Boutique Kastel">`,
      `<meta property="og:title" content="${escAttr(p.name)}">`,
      `<meta property="og:description" content="${escAttr(r.description)}">`,
      `<meta property="og:url" content="${escAttr(r.canonical)}">`,
      `<meta property="og:image" content="${escAttr(image)}">`,
      `<meta property="og:locale" content="ro_RO">`,
      `<script type="application/ld+json" id="productJsonLd">${r.jsonLd.replace(/</g, '\\u003c')}</script>`,
    ].join('\n');
    return html
      // All of the site's links and assets are root-relative ("style.css",
      // "cos.html", "catalog.json"); <base> keeps them working from /produs/<slug>/.
      // The ?cod= shell is noindex; the static product pages must be indexable.
      .replace(/<meta name="robots"[^>]*id="shellNoindex">\n?/, '')
      .replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n<base href="/">')
      .replace(/<title>[^<]*<\/title>/, () => `<title>${escAttr(r.title)}</title>`)
      .replace(/(<meta name="description" id="metaDescription" content=")[^"]*(")/, (_, a, b) => `${a}${escAttr(r.description)}${b}`)
      .replace('</head>', () => `${head}\n</head>`)
      .replace(loading, () => r.main);
  };
}

// ---------- main ----------

const catalogRaw = JSON.parse(read('catalog.json'));
const oldSlugs = fs.existsSync(SLUG_MAP) ? JSON.parse(read(SLUG_MAP)) : {};

// Keep a product's URL stable forever once assigned: reuse its existing slug
// (from catalog.json or the slug map) even if the owner later renames it.
const used = new Set();
const assignSlug = (p, existing) => {
  let slug = existing || makeSlug(p);
  while (used.has(slug)) slug = `${slug}-x`;
  used.add(slug);
  return slug;
};
const catalog = catalogRaw.map((p) => ({ ...p, slug: assignSlug(p, p.slug || oldSlugs[p.cod]) }));

// Browsers fetch Firestore docs edited after `since`; 15 min of overlap
// covers clock skew and edits made while this run is in progress.
const snapshotSince = new Date(Date.now() - 15 * 60 * 1000).toISOString();
const docs = await fetchOverrides();
const products = mergeWithOverrides(catalog, docs);
for (const p of products) if (!p.slug) p.slug = assignSlug(p, oldSlugs[p.cod]);

const render = makeRenderer();
const fill = makeTemplate();

// Rebuild produs/ from scratch so products taken off sale lose their page.
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const slugMap = {};
for (const p of products) {
  const r = render(p);
  if (!r.main || !r.canonical.includes(`/produs/${p.slug}/`)) throw new Error(`Render failed for ${p.cod}`);
  const dir = path.join(OUT_DIR, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), fill(p, r));
  slugMap[p.cod] = p.slug;
}
fs.writeFileSync(SLUG_MAP, JSON.stringify(slugMap));

// Static copy of every override, so storefront pages don't read the whole
// products collection on each view (see product-overrides.js).
fs.writeFileSync('product-overrides.json', JSON.stringify({ since: snapshotSince, overrides: overridesMap(docs) }));

// catalog.json carries the slug so every product link on the site can point
// at the static page without an extra request.
fs.writeFileSync('catalog.json', JSON.stringify(catalog, null, 2));

const urls = [
  ...STATIC_PAGES.map((p) => `  <url>\n    <loc>${SITE}/${p.url}</loc>\n    <priority>${p.priority}</priority>\n  </url>`),
  ...products.map((p) => `  <url>\n    <loc>${escXml(`${SITE}/${OUT_DIR}/${p.slug}/`)}</loc>\n    <priority>0.6</priority>\n  </url>`),
];
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

console.log(`Generated ${products.length} product pages (${docs.length} Firestore overrides), sitemap with ${urls.length} URLs.`);
