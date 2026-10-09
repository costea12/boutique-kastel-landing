// Merges live owner edits (stock count, taken-off-sale) from Firestore's
// `products/{cod}` collection on top of the static catalog.json data, so the
// admin panel's product management can affect the live site without a code
// deploy. Falls back silently to the untouched catalog.json data if Firestore
// is unreachable - the site must keep working even if this layer fails.
function applyProductOverrides(products) {
  if (!window.firebase || !firebase.firestore) return Promise.resolve(products);

  return firebase.firestore().collection('products').get()
    .then((snap) => {
      const overrides = {};
      snap.forEach((doc) => { overrides[doc.id] = doc.data(); });

      const known = new Set(products.map((p) => p.cod));

      const merged = products.map((p) => {
        const o = overrides[p.cod];
        if (!o) return p;
        return Object.assign({}, p, {
          stock: typeof o.stock === 'number' ? o.stock : p.stock,
          active: o.active !== false,
          bottle_image: o.image || p.bottle_image,
          description: o.description || p.description,
        });
      });

      // Brand-new products added from the admin panel live only in
      // Firestore (never written to catalog.json), so they're not in the
      // `products` array fetched above - add them here.
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
    })
    .catch(() => products);
}
