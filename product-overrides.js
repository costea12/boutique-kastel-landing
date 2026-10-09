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

      return products
        .map((p) => {
          const o = overrides[p.cod];
          if (!o) return p;
          return Object.assign({}, p, {
            stock: typeof o.stock === 'number' ? o.stock : p.stock,
            active: o.active !== false,
          });
        })
        .filter((p) => p.active !== false);
    })
    .catch(() => products);
}
