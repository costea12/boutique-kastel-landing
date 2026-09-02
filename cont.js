// Login / signup / order history logic for cont.html.
(function () {
  if (!window.firebase || !firebase.auth) return;

  // Order/address fields (city, name, notes, etc.) are typed by whoever owns
  // the account - never trust them when building innerHTML, even though today
  // only the owner can read their own orders. Escape before interpolating.
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  const loggedOutView = document.getElementById('accountLoggedOut');
  const loggedInView = document.getElementById('accountLoggedIn');

  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');

  const accountGreeting = document.getElementById('accountGreeting');
  const accountEmail = document.getElementById('accountEmail');
  const ordersEmpty = document.getElementById('ordersEmpty');
  const ordersList = document.getElementById('ordersList');
  const logoutBtn = document.getElementById('logoutBtn');

  const addressForm = document.getElementById('addressForm');
  const addressSaved = document.getElementById('addressSaved');

  const favoritesEmpty = document.getElementById('favoritesEmpty');
  const favoritesList = document.getElementById('favoritesList');
  let catalogCache = null;
  function getCatalog() {
    if (catalogCache) return Promise.resolve(catalogCache);
    return fetch('catalog.json').then(function (r) { return r.json(); }).then(function (data) {
      catalogCache = data;
      return data;
    });
  }

  function showTab(tab) {
    const isLogin = tab === 'login';
    tabLogin.classList.toggle('is-active', isLogin);
    tabSignup.classList.toggle('is-active', !isLogin);
    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;
    loginError.hidden = true;
    signupError.hidden = true;
  }

  tabLogin?.addEventListener('click', () => showTab('login'));
  tabSignup?.addEventListener('click', () => showTab('signup'));

  function friendlyError(code) {
    const map = {
      'auth/email-already-in-use': 'Există deja un cont cu acest e-mail. Încearcă să te autentifici.',
      'auth/invalid-email': 'Adresa de e-mail nu este validă.',
      'auth/weak-password': 'Parola trebuie să aibă cel puțin 6 caractere.',
      // Same wording for both - don't reveal whether an email is registered.
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
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password).catch(function (err) {
      loginError.textContent = friendlyError(err.code);
      loginError.hidden = false;
    });
  });

  signupForm?.addEventListener('submit', function (e) {
    e.preventDefault();
    signupError.hidden = true;

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    const consent = document.getElementById('signupConsent').checked;
    const newsletterOptIn = document.getElementById('signupNewsletter').checked;

    if (password !== passwordConfirm) {
      signupError.textContent = 'Parolele nu coincid.';
      signupError.hidden = false;
      return;
    }
    if (!consent) {
      signupError.textContent = 'Trebuie să fii de acord cu prelucrarea datelor pentru a crea un cont.';
      signupError.hidden = false;
      return;
    }

    auth.createUserWithEmailAndPassword(email, password)
      .then(function (cred) {
        return cred.user.updateProfile({ displayName: name }).then(function () {
          return db.collection('users').doc(cred.user.uid).set({
            name: name,
            email: email,
            consentAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            newsletterOptIn: newsletterOptIn,
            newsletterOptInAt: newsletterOptIn ? firebase.firestore.FieldValue.serverTimestamp() : null,
          });
        }).then(function () {
          // onAuthStateChanged can fire before updateProfile resolves, with a
          // stale displayName - show the logged-in view ourselves right away
          // using the now-updated cred.user instead of waiting on it again.
          showLoggedIn(cred.user);
        });
      })
      .catch(function (err) {
        signupError.textContent = friendlyError(err.code);
        signupError.hidden = false;
      });
  });

  logoutBtn?.addEventListener('click', function () {
    auth.signOut();
  });

  function renderFavorites(cods) {
    if (!cods || !cods.length) {
      favoritesEmpty.hidden = false;
      favoritesList.innerHTML = '';
      return;
    }
    getCatalog().then(function (data) {
      const products = cods.map(function (c) { return data.find(function (p) { return p.cod === c; }); }).filter(Boolean);
      if (!products.length) {
        favoritesEmpty.hidden = false;
        favoritesList.innerHTML = '';
        return;
      }
      favoritesEmpty.hidden = true;
      favoritesList.innerHTML = products.map(function (p) {
        return '<a class="favorites-item" href="produs.html?cod=' + encodeURIComponent(p.cod) + '">'
          + '<img src="' + p.bottle_image + '" alt="' + escapeHtml(p.name) + '" loading="lazy">'
          + '<span class="favorites-item-name">' + escapeHtml(p.name) + '</span>'
          + '<span class="favorites-item-price">' + p.price.toFixed(2).replace('.', ',') + ' Lei</span>'
          + '</a>';
      }).join('');
    });
  }

  function loadAddress(user) {
    db.collection('users').doc(user.uid).get().then(function (doc) {
      const d = doc.data() || {};
      document.getElementById('shipName').value = d.shipName || user.displayName || '';
      document.getElementById('shipPhone').value = d.shipPhone || '';
      document.getElementById('shipAddress').value = d.shipAddress || '';
      document.getElementById('shipCity').value = d.shipCity || '';
      document.getElementById('shipCounty').value = d.shipCounty || '';
      document.getElementById('shipPostalCode').value = d.shipPostalCode || '';
      document.getElementById('shipCountry').value = d.shipCountry || 'România';
      document.getElementById('shipNotes').value = d.shipNotes || '';

      const isCompanyBox = document.getElementById('isCompanyOrder');
      const companyFields = document.getElementById('companyFields');
      isCompanyBox.checked = !!d.isCompanyOrder;
      companyFields.hidden = !d.isCompanyOrder;
      document.getElementById('companyName').value = d.companyName || '';
      document.getElementById('companyCUI').value = d.companyCUI || '';
      document.getElementById('companyRegCom').value = d.companyRegCom || '';
      document.getElementById('companyAddress').value = d.companyAddress || '';

      renderFavorites(d.favorites || []);
    });
  }

  // Show/hide company invoice fields as the checkbox is toggled (also runs on load via loadAddress above).
  document.getElementById('isCompanyOrder')?.addEventListener('change', function () {
    document.getElementById('companyFields').hidden = !this.checked;
  });

  addressForm?.addEventListener('submit', function (e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    addressSaved.hidden = true;

    const isCompanyOrder = document.getElementById('isCompanyOrder').checked;

    const address = {
      shipName: document.getElementById('shipName').value.trim(),
      shipPhone: document.getElementById('shipPhone').value.trim(),
      shipAddress: document.getElementById('shipAddress').value.trim(),
      shipCity: document.getElementById('shipCity').value.trim(),
      shipCounty: document.getElementById('shipCounty').value.trim(),
      shipPostalCode: document.getElementById('shipPostalCode').value.trim(),
      shipCountry: document.getElementById('shipCountry').value.trim(),
      shipNotes: document.getElementById('shipNotes').value.trim(),
      isCompanyOrder: isCompanyOrder,
      companyName: isCompanyOrder ? document.getElementById('companyName').value.trim() : '',
      companyCUI: isCompanyOrder ? document.getElementById('companyCUI').value.trim() : '',
      companyRegCom: isCompanyOrder ? document.getElementById('companyRegCom').value.trim() : '',
      companyAddress: isCompanyOrder ? document.getElementById('companyAddress').value.trim() : '',
    };

    if (isCompanyOrder && (!address.companyName || !address.companyCUI)) {
      addressSaved.hidden = true;
      alert('Pentru factură pe firmă, completează cel puțin denumirea firmei și CUI/CIF.');
      return;
    }

    db.collection('users').doc(user.uid).set(address, { merge: true }).then(function () {
      addressSaved.hidden = false;
      setTimeout(function () { addressSaved.hidden = true; }, 2500);
    });
  });

  function loadOrders(uid) {
    db.collection('users').doc(uid).collection('orders')
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snap) {
        if (snap.empty) {
          ordersEmpty.hidden = false;
          ordersList.innerHTML = '';
          return;
        }
        ordersEmpty.hidden = true;
        const statusLabels = { noua: 'În așteptare confirmare', confirmata: 'Confirmată', livrata: 'Livrată', anulata: 'Anulată' };
        ordersList.innerHTML = snap.docs.map(function (doc) {
          const o = doc.data();
          const itemCount = (o.items || []).reduce(function (sum, i) { return sum + (i.qty || 1); }, 0);
          const date = o.createdAt ? o.createdAt.toDate().toLocaleDateString('ro-RO') : '';
          const isPending = !o.status || o.status === 'noua';
          const status = statusLabels[o.status] || 'În așteptare confirmare';
          const city = o.shipping && o.shipping.city ? ' · livrare în ' + escapeHtml(o.shipping.city) : '';
          const cancelBtn = isPending
            ? '<button type="button" class="order-cancel-btn" data-order-id="' + doc.id + '">Anulează comanda</button>'
            : '';
          const numberLabel = o.orderNumber ? '#' + String(o.orderNumber).padStart(4, '0') + ' · ' : '';
          return '<div class="order-item">'
            + '<div class="order-item-top"><strong>' + numberLabel + (o.total ? o.total.toFixed(2).replace('.', ',') + ' Lei' : '') + '</strong><span class="order-status">' + status + '</span></div>'
            + '<div class="order-item-meta">' + itemCount + ' produs' + (itemCount === 1 ? '' : 'e') + (date ? ' · ' + date : '') + city + '</div>'
            + cancelBtn
            + '</div>';
        }).join('');
      })
      .catch(function () {
        // Orders collection/rules not reachable yet - keep the empty state, no need to alarm the user.
        ordersEmpty.hidden = false;
      });
  }

  // Event delegation - order items get re-rendered on every loadOrders() call,
  // so a single listener on the (stable) container is simpler than re-binding
  // a fresh listener to each button every time.
  ordersList?.addEventListener('click', function (e) {
    const btn = e.target.closest('.order-cancel-btn');
    if (!btn) return;
    const user = auth.currentUser;
    if (!user) return;

    if (!window.confirm('Ești sigur că vrei să anulezi această comandă?')) return;

    btn.disabled = true;
    btn.textContent = 'Se anulează...';
    db.collection('users').doc(user.uid).collection('orders').doc(btn.dataset.orderId)
      .update({ status: 'anulata', canceledAt: firebase.firestore.FieldValue.serverTimestamp() })
      .then(function () { loadOrders(user.uid); })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Anulează comanda';
        alert('Nu am putut anula comanda. Te rugăm încearcă din nou sau sună-ne la 0744 377 651.');
      });
  });

  function showLoggedIn(user) {
    loggedOutView.hidden = true;
    loggedInView.hidden = false;
    accountGreeting.textContent = 'Bună, ' + (user.displayName || 'acolo') + '!';
    accountEmail.textContent = user.email;
    const avatarEl = document.getElementById('accountAvatar');
    if (avatarEl) avatarEl.textContent = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();
    loadAddress(user);
    loadOrders(user.uid);

    // The section is hidden until login resolves, so a direct #favorites
    // link (from the header heart icon) needs a manual scroll here - the
    // browser's automatic anchor-scroll already ran once, before this.
    if (window.location.hash === '#favorites') {
      document.getElementById('favorites')?.scrollIntoView();
    }
  }

  auth.onAuthStateChanged(function (user) {
    if (user) {
      showLoggedIn(user);
    } else {
      loggedOutView.hidden = false;
      loggedInView.hidden = true;
      showTab('login');
    }
  });

  // Show/hide password toggle buttons (login, signup, confirm password).
  document.querySelectorAll('.password-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? 'Ascunde' : 'Arată';
      btn.setAttribute('aria-label', isHidden ? 'Ascunde parola' : 'Arată parola');
    });
  });
})();
