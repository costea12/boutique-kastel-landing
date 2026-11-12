// Merges live owner edits (stock count, taken-off-sale, price, photos,
// admin-added products) from Firestore's `products/{cod}` collection on top of
// the static catalog.json data, so the admin panel's product management can
// affect the live site without a code deploy. Falls back silently to the
// untouched catalog.json data if this layer fails - the site must keep
// working even then.
//
// Quota: reading the whole collection costs one Firestore read per document
// (~900) on every page view, which exhausted the free 50k reads/day on
// 2026-11-12 once Google started crawling the per-product pages. So the daily
// generate-pages.mjs run publishes every override as product-overrides.json
// (a free static file), and the browser only asks Firestore for docs edited
// after that snapshot (`updatedAt`, set by the admin panel on every write):
// usually zero docs, billed as a single read.

const PRODUCT_OVERRIDES_SNAPSHOT = 'product-overrides.json';

// Pure merge, shared with generate-pages.mjs. `overrides` is {cod: data}.
function mergeProductOverrides(products, overrides) {
  const known = new Set(products.map((p) => p.cod));

  const merged = products.map((p) => {
    const o = overrides[p.cod];
    if (!o) return p;
    return Object.assign({}, p, {
      stock: typeof o.stock === 'number' ? o.stock : p.stock,
      active: o.active !== false,
      bottle_image: o.image || p.bottle_image,
      description: o.description || p.description,
      name: o.name || p.name,
      brand: o.brand || p.brand,
      price: typeof o.price === 'number' ? o.price : p.price,
    });
  });

  // Brand-new products added from the admin panel live only in Firestore
  // (never written to catalog.json), so add them here.
  Object.keys(overrides).forEach((cod) => {
    if (known.has(cod)) return;
    const o = overrides[cod];
    if (!o.isNew || !o.name) return;
    merged.push({
      cod,
      name: o.name,
      brand: o.brand || '',
      category: o.category || '',
      category_label: o.category_label || '',
      niche: !!o.niche,
      price: typeof o.price === 'number' ? o.price : null,
      stock: typeof o.stock === 'number' ? o.stock : 0,
      bottle_image: o.image || '',
      description: o.description || '',
      active: o.active,
    });
  });

  return merged.filter((p) => p.active !== false);
}

function loadProductOverrides() {
  const col = firebase.firestore().collection('products');
  const collect = (snap, into) => { snap.forEach((doc) => { into[doc.id] = doc.data(); }); return into; };

  return fetch(PRODUCT_OVERRIDES_SNAPSHOT, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no snapshot'))))
    .then((snapshot) => {
      const overrides = Object.assign({}, snapshot.overrides);
      return col.where('updatedAt', '>', new Date(snapshot.since)).get()
        .then((snap) => collect(snap, overrides))
        .catch(() => overrides); // snapshot alone is at most a day stale
    });
  // No snapshot: rejects, and applyProductOverrides serves plain catalog.json.
  // Deliberately no full-collection fallback - that's what burned the quota.
}

function applyProductOverrides(products) {
  if (!window.firebase || !firebase.firestore) return Promise.resolve(products);
  return loadProductOverrides()
    .then((overrides) => mergeProductOverrides(products, overrides))
    .catch(() => products);
}
