// Owner-facing admin panel: view every order across all customers, change
// status. Mirrors cont.js's auth-gating pattern (onAuthStateChanged toggling
// hidden views), but the actual "is this user allowed to see this" check is
// enforced by Firestore security rules (firestore.rules), not by this page -
// this client-side admins/{uid} check is only for UX, never trusted as security.
(function () {
  if (!window.firebase || !firebase.auth) return;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  const loggedOutView = document.getElementById('adminLoggedOut');
  const noAccessView = document.getElementById('adminNoAccess');
  const panelView = document.getElementById('adminPanel');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  const loginForm = document.getElementById('adminLoginForm');
  const loginError = document.getElementById('adminLoginError');

  const ordersList = document.getElementById('adminOrdersList');
  const ordersEmpty = document.getElementById('adminOrdersEmpty');
  const returnsList = document.getElementById('adminReturnsList');
  const returnsEmpty = document.getElementById('adminReturnsEmpty');

  const STATUS_LABELS = { noua: 'În așteptare confirmare', confirmata: 'Confirmată', livrata: 'Livrată', anulata: 'Anulată' };
  const RETURN_STATUS_LABELS = { noua: 'Nouă', rezolvata: 'Rezolvată' };

  function friendlyError(code) {
    const map = {
      'auth/user-not-found': 'E-mail sau parolă incorectă.',
      'auth/wrong-password': 'E-mail sau parolă incorectă.',
      'auth/invalid-credential': 'E-mail sau parolă incorectă.',
      'auth/too-many-requests': 'Prea multe încercări. Încearcă din nou mai târziu.',
    };
    return map[code] || 'A apărut o eroare. Te rugăm încearcă din nou.';
  }

  loginForm?.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.hidden = true;
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    auth.signInWithEmailAndPassword(email, password).catch(function (err) {
      loginError.textContent = friendlyError(err.code);
      loginError.hidden = false;
    });
  });

  logoutBtn?.addEventListener('click', function () { auth.signOut(); });

  // Sidebar section switching
  const sidebarLinks = document.querySelectorAll('.admin-sidebar-link');
  const sections = document.querySelectorAll('.admin-panel-section');
  sidebarLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      sidebarLinks.forEach(function (l) { l.classList.remove('is-active'); });
      sections.forEach(function (s) { s.classList.remove('is-active'); });
      link.classList.add('is-active');
      document.getElementById('section-' + link.dataset.section)?.classList.add('is-active');
      if (link.dataset.section === 'products') loadProducts();
    });
  });

  function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) { el.textContent = String(count); el.hidden = false; }
    else { el.hidden = true; }
  }

  function renderOrders(docs) {
    setBadge('badgeOrders', docs.filter(function (d) { return (d.data().status || 'noua') === 'noua'; }).length);
    if (!docs.length) {
      ordersEmpty.hidden = false;
      ordersList.innerHTML = '';
      return;
    }
    ordersEmpty.hidden = true;
    ordersList.innerHTML = docs.map(function (doc) {
      const o = doc.data();
      const uid = doc.ref.parent.parent.id;
      const date = o.createdAt ? o.createdAt.toDate().toLocaleString('ro-RO') : '';
      const status = o.status || 'noua';
      const numberLabel = o.orderNumber ? '#' + String(o.orderNumber).padStart(4, '0') : doc.id;
      const items = (o.items || []).map(function (i) {
        return '<li>' + (i.qty || 1) + '× ' + escapeHtml(i.name) + ' — ' + (i.price || 0).toFixed(2).replace('.', ',') + ' Lei</li>';
      }).join('');
      const s = o.shipping || {};
      const shipping = [s.name, s.address, s.city, s.county, s.postalCode, s.country].filter(Boolean).map(escapeHtml).join(', ');

      return '<div class="admin-order" data-uid="' + uid + '" data-order-id="' + doc.id + '">'
        + '<div class="admin-order-top">'
        + '<strong>' + numberLabel + '</strong>'
        + '<span>' + (o.total || 0).toFixed(2).replace('.', ',') + ' Lei</span>'
        + '<span>' + date + '</span>'
        + '<select class="admin-order-status" data-order-id="' + doc.id + '" data-uid="' + uid + '">'
        + Object.keys(STATUS_LABELS).map(function (key) {
          return '<option value="' + key + '"' + (key === status ? ' selected' : '') + '>' + STATUS_LABELS[key] + '</option>';
        }).join('')
        + '</select>'
        + '</div>'
        + '<div class="admin-order-customer">' + escapeHtml(o.customerName || '') + ' &middot; ' + escapeHtml(o.customerEmail || '') + '</div>'
        + '<div class="admin-order-shipping">' + shipping + '</div>'
        + '<ul class="admin-order-items">' + items + '</ul>'
        + '</div>';
    }).join('');
  }

  ordersList?.addEventListener('change', function (e) {
    const select = e.target.closest('.admin-order-status');
    if (!select) return;
    const uid = select.dataset.uid;
    const orderId = select.dataset.orderId;
    select.disabled = true;
    db.collection('users').doc(uid).collection('orders').doc(orderId)
      .update({ status: select.value })
      .catch(function () {
        alert('Nu am putut actualiza statusul. Încearcă din nou.');
      })
      .finally(function () { select.disabled = false; });
  });

  function loadAllOrders() {
    db.collectionGroup('orders').orderBy('createdAt', 'desc').get()
      .then(function (snap) { renderOrders(snap.docs); })
      .catch(function (err) {
        console.error('Nu am putut încărca comenzile:', err);
        ordersEmpty.hidden = false;
        ordersEmpty.textContent = 'Nu am putut încărca comenzile.';
      });
  }

  function renderReturns(docs) {
    setBadge('badgeReturns', docs.filter(function (d) { return (d.data().status || 'noua') === 'noua'; }).length);
    if (!docs.length) {
      returnsEmpty.hidden = false;
      returnsList.innerHTML = '';
      return;
    }
    returnsEmpty.hidden = true;
    returnsList.innerHTML = docs.map(function (doc) {
      const r = doc.data();
      const date = r.createdAt ? r.createdAt.toDate().toLocaleString('ro-RO') : '';
      const status = r.status || 'noua';
      const numberLabel = r.orderNumber ? '#' + String(r.orderNumber).padStart(4, '0') : r.orderId;

      return '<div class="admin-order" data-return-id="' + doc.id + '">'
        + '<div class="admin-order-top">'
        + '<strong>Comanda ' + numberLabel + '</strong>'
        + '<span>' + escapeHtml(r.reason || '') + '</span>'
        + '<span>' + date + '</span>'
        + '<select class="admin-return-status" data-return-id="' + doc.id + '">'
        + Object.keys(RETURN_STATUS_LABELS).map(function (key) {
          return '<option value="' + key + '"' + (key === status ? ' selected' : '') + '>' + RETURN_STATUS_LABELS[key] + '</option>';
        }).join('')
        + '</select>'
        + '</div>'
        + '<div class="admin-order-customer">' + escapeHtml(r.customerName || '') + ' &middot; ' + escapeHtml(r.customerEmail || '') + '</div>'
        + (r.message ? '<div class="admin-order-shipping">' + escapeHtml(r.message) + '</div>' : '')
        + '</div>';
    }).join('');
  }

  returnsList?.addEventListener('change', function (e) {
    const select = e.target.closest('.admin-return-status');
    if (!select) return;
    select.disabled = true;
    db.collection('returnRequests').doc(select.dataset.returnId)
      .update({ status: select.value })
      .catch(function () {
        alert('Nu am putut actualiza statusul. Încearcă din nou.');
      })
      .finally(function () { select.disabled = false; });
  });

  function loadAllReturns() {
    db.collection('returnRequests').orderBy('createdAt', 'desc').get()
      .then(function (snap) { renderReturns(snap.docs); })
      .catch(function (err) {
        console.error('Nu am putut încărca cererile de retur:', err);
        returnsEmpty.hidden = false;
        returnsEmpty.textContent = 'Nu am putut încărca cererile de retur.';
      });
  }

  // ---------- Products section ----------
  const CATEGORY_LABELS = {
    PRF: 'Parfumuri', 'PRF-niche': 'Parfumuri niche',
    ICP: 'Îngrijire corporală', ALC: 'Băuturi', DLC: 'Dulciuri', CAF: 'Cafea',
  };
  function categoryKey(p) { return p.category === 'PRF' && p.niche ? 'PRF-niche' : p.category; }

  const productsGrid = document.getElementById('adminProductsGrid');
  const productsEmpty = document.getElementById('adminProductsEmpty');
  const productsLoading = document.getElementById('adminProductsLoading');
  const productsCount = document.getElementById('adminProductCount');
  const productSearch = document.getElementById('adminProductSearch');
  const productCategory = document.getElementById('adminProductCategory');
  const productOutOnly = document.getElementById('adminProductOutOnly');

  let ALL_PRODUCTS = [];
  let productsLoaded = false;
  const pendingStockSaves = {};

  function formatPriceAdmin(p) {
    return p != null ? p.toFixed(2).replace('.', ',') + ' Lei' : '';
  }

  function renderProductCard(p) {
    const isOut = (p.stock || 0) <= 0;
    const isInactive = p.active === false;
    return '<div class="admin-product-card' + (isInactive ? ' is-inactive' : '') + '" data-cod="' + p.cod + '">'
      + '<div class="admin-product-img">'
      + '<img src="' + p.bottle_image + '" alt="' + escapeHtml(p.name) + '" loading="lazy">'
      + (isOut ? '<span class="stock-badge out">Stoc epuizat</span>' : '')
      + (isInactive ? '<span class="admin-product-offbadge">Scos din vânzare</span>' : '')
      + '</div>'
      + '<div class="admin-product-info">'
      + '<span class="product-brand">' + escapeHtml(p.brand || '') + '</span>'
      + '<h3>' + escapeHtml(p.name) + '</h3>'
      + '<span class="product-price">' + formatPriceAdmin(p.price) + '</span>'
      + '<label class="admin-product-stock-label">Stoc'
      + '<input type="number" min="0" step="1" class="admin-product-stock-input" data-cod="' + p.cod + '" value="' + (p.stock != null ? p.stock : 0) + '">'
      + '</label>'
      + '<button type="button" class="admin-product-toggle" data-cod="' + p.cod + '" data-active="' + (isInactive ? 'false' : 'true') + '">'
      + (isInactive ? 'Repune în vânzare' : 'Scoate din vânzare')
      + '</button>'
      + '<span class="admin-product-saved" data-cod-saved="' + p.cod + '" hidden>Salvat ✓</span>'
      + '</div>'
      + '</div>';
  }

  function applyProductFilters() {
    const q = (productSearch?.value || '').trim();
    const cat = productCategory?.value || '';
    const outOnly = !!productOutOnly?.checked;

    const filtered = ALL_PRODUCTS.filter(function (p) {
      if (cat && categoryKey(p) !== cat) return false;
      if (outOnly && (p.stock || 0) > 0) return false;
      if (q && !fuzzyMatch(q, p.name) && !fuzzyMatch(q, p.brand || '')) return false;
      return true;
    });

    productsCount.textContent = filtered.length + (filtered.length === 1 ? ' produs' : ' produse');

    if (!filtered.length) {
      productsEmpty.hidden = false;
      productsGrid.innerHTML = '';
      return;
    }
    productsEmpty.hidden = true;
    productsGrid.innerHTML = filtered.map(renderProductCard).join('');
  }

  function loadProducts() {
    if (productsLoaded) { applyProductFilters(); return; }
    productsLoading.hidden = false;
    Promise.all([
      fetch('catalog.json').then(function (r) { return r.json(); }),
      db.collection('products').get(),
    ]).then(function (results) {
      const catalog = results[0];
      const overridesSnap = results[1];
      const overrides = {};
      overridesSnap.forEach(function (doc) { overrides[doc.id] = doc.data(); });

      ALL_PRODUCTS = catalog.map(function (p) {
        const o = overrides[p.cod];
        if (!o) return p;
        return Object.assign({}, p, {
          stock: typeof o.stock === 'number' ? o.stock : p.stock,
          active: o.active !== false,
        });
      });
      productsLoaded = true;
      productsLoading.hidden = true;
      applyProductFilters();
    }).catch(function () {
      productsLoading.textContent = 'Nu am putut încărca produsele.';
    });
  }

  function saveStock(cod, value) {
    const card = productsGrid.querySelector('.admin-product-card[data-cod="' + cod + '"]');
    const savedEl = productsGrid.querySelector('[data-cod-saved="' + cod + '"]');
    db.collection('products').doc(cod).set({ stock: value }, { merge: true })
      .then(function () {
        const p = ALL_PRODUCTS.find(function (x) { return x.cod === cod; });
        if (p) p.stock = value;
        const badge = card?.querySelector('.stock-badge.out');
        if (value <= 0 && !badge && card) {
          card.querySelector('.admin-product-img').insertAdjacentHTML('afterbegin', '<span class="stock-badge out">Stoc epuizat</span>');
        } else if (value > 0 && badge) {
          badge.remove();
        }
        if (savedEl) {
          savedEl.hidden = false;
          setTimeout(function () { savedEl.hidden = true; }, 1500);
        }
      })
      .catch(function () {
        alert('Nu am putut salva stocul. Încearcă din nou.');
      });
  }

  productsGrid?.addEventListener('change', function (e) {
    const input = e.target.closest('.admin-product-stock-input');
    if (!input) return;
    const cod = input.dataset.cod;
    const value = Math.max(0, parseInt(input.value, 10) || 0);
    input.value = value;
    clearTimeout(pendingStockSaves[cod]);
    pendingStockSaves[cod] = setTimeout(function () { saveStock(cod, value); }, 400);
  });

  productsGrid?.addEventListener('click', function (e) {
    const btn = e.target.closest('.admin-product-toggle');
    if (!btn) return;
    const cod = btn.dataset.cod;
    const willBeActive = btn.dataset.active === 'false';
    btn.disabled = true;
    db.collection('products').doc(cod).set({ active: willBeActive }, { merge: true })
      .then(function () {
        const p = ALL_PRODUCTS.find(function (x) { return x.cod === cod; });
        if (p) p.active = willBeActive;
        applyProductFilters();
      })
      .catch(function () {
        alert('Nu am putut actualiza produsul. Încearcă din nou.');
      })
      .finally(function () { btn.disabled = false; });
  });

  productSearch?.addEventListener('input', applyProductFilters);
  productCategory?.addEventListener('change', applyProductFilters);
  productOutOnly?.addEventListener('change', applyProductFilters);

  auth.onAuthStateChanged(function (user) {
    loginForm.reset();
    loginError.hidden = true;

    if (!user) {
      loggedOutView.hidden = false;
      noAccessView.hidden = true;
      panelView.hidden = true;
      logoutBtn.hidden = true;
      return;
    }

    logoutBtn.hidden = false;
    db.collection('admins').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) {
        loggedOutView.hidden = true;
        noAccessView.hidden = false;
        panelView.hidden = true;
        return;
      }
      loggedOutView.hidden = true;
      noAccessView.hidden = true;
      panelView.hidden = false;
      loadAllOrders();
      loadAllReturns();
    }).catch(function () {
      // Firestore rules deny read (not an admin), or a network error - either
      // way, fail closed rather than showing the panel.
      loggedOutView.hidden = true;
      noAccessView.hidden = false;
      panelView.hidden = true;
    });
  });
})();
