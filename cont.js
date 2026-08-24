// Login / signup / order history logic for cont.html.
(function () {
  if (!window.firebase || !firebase.auth) return;

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
      'auth/user-not-found': 'Nu există niciun cont cu acest e-mail.',
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
          const status = statusLabels[o.status] || 'În așteptare confirmare';
          return '<div class="order-item">'
            + '<div class="order-item-top"><strong>' + (o.total ? o.total.toFixed(2).replace('.', ',') + ' Lei' : '') + '</strong><span class="order-status">' + status + '</span></div>'
            + '<div class="order-item-meta">' + itemCount + ' produs' + (itemCount === 1 ? '' : 'e') + (date ? ' · ' + date : '') + '</div>'
            + '</div>';
        }).join('');
      })
      .catch(function () {
        // Orders collection/rules not reachable yet - keep the empty state, no need to alarm the user.
        ordersEmpty.hidden = false;
      });
  }

  function showLoggedIn(user) {
    loggedOutView.hidden = true;
    loggedInView.hidden = false;
    accountGreeting.textContent = 'Bună, ' + (user.displayName || 'acolo') + '!';
    accountEmail.textContent = user.email;
    loadOrders(user.uid);
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
})();
