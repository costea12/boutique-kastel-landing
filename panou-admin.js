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

  const STATUS_LABELS = { noua: 'În așteptare confirmare', confirmata: 'Confirmată', livrata: 'Livrată', anulata: 'Anulată' };

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

  function renderOrders(docs) {
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
    }).catch(function () {
      // Firestore rules deny read (not an admin), or a network error - either
      // way, fail closed rather than showing the panel.
      loggedOutView.hidden = true;
      noAccessView.hidden = false;
      panelView.hidden = true;
    });
  });
})();
