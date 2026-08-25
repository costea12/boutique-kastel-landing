// Favorites (wishlist) - stored per-account in Firestore, on the same
// users/{uid} doc as the shipping address ("favorites": array of product cods).
// Requires login, same gate pattern as checkout: clicking the heart while
// logged out sends you to cont.html instead of silently doing nothing.
(function () {
  if (!window.firebase || !firebase.auth) return;

  let currentUid = null;
  let currentFavorites = [];

  function heartIcon(filled) {
    return filled
      ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2 5 5.5 5c2 0 3.4 1.1 4.2 2.3.4.6.6.9 1 .9s.6-.3 1-.9C12.5 6.1 13.9 5 15.9 5 19.4 5 21 8.4 19.4 11.7 17.9 16.4 12 21 12 21z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2 5 5.5 5c2 0 3.4 1.1 4.2 2.3.4.6.6.9 1 .9s.6-.3 1-.9C12.5 6.1 13.9 5 15.9 5 19.4 5 21 8.4 19.4 11.7 17.9 16.4 12 21 12 21z"/></svg>';
  }

  // Exposed globally - catalog.js/produs.js/script.js call this while
  // building their product-card HTML, wherever a card should get a heart.
  window.favoriteButtonHtml = function (cod) {
    const isFav = currentFavorites.includes(cod);
    return '<button type="button" class="favorite-btn' + (isFav ? ' is-active' : '') + '" data-cod="' + cod + '" aria-label="' +
      (isFav ? 'Elimină de la favorite' : 'Adaugă la favorite') + '">' + heartIcon(isFav) + '</button>';
  };

  // Exposed globally - called after any page re-renders a product grid, so
  // freshly-inserted heart buttons pick up the current favorited state.
  window.syncFavoriteHearts = function () {
    document.querySelectorAll('.favorite-btn').forEach(function (btn) {
      const isFav = currentFavorites.includes(btn.dataset.cod);
      btn.classList.toggle('is-active', isFav);
      btn.innerHTML = heartIcon(isFav);
      btn.setAttribute('aria-label', isFav ? 'Elimină de la favorite' : 'Adaugă la favorite');
    });
    const badge = document.getElementById('favoritesCount');
    if (badge) {
      badge.textContent = currentFavorites.length;
      badge.hidden = currentFavorites.length === 0;
    }
  };

  function loadFavorites(uid) {
    firebase.firestore().collection('users').doc(uid).get().then(function (doc) {
      currentFavorites = (doc.data() || {}).favorites || [];
      window.syncFavoriteHearts();
    });
  }

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      currentUid = user.uid;
      loadFavorites(user.uid);
    } else {
      currentUid = null;
      currentFavorites = [];
      window.syncFavoriteHearts();
    }
  });

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.favorite-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    if (!currentUid) {
      window.location.href = 'cont.html';
      return;
    }

    const cod = btn.dataset.cod;
    const isFav = currentFavorites.includes(cod);

    // Optimistic UI update - flip it immediately, then persist.
    currentFavorites = isFav
      ? currentFavorites.filter(function (c) { return c !== cod; })
      : currentFavorites.concat([cod]);
    window.syncFavoriteHearts();

    firebase.firestore().collection('users').doc(currentUid).set({
      favorites: isFav
        ? firebase.firestore.FieldValue.arrayRemove(cod)
        : firebase.firestore.FieldValue.arrayUnion(cod),
    }, { merge: true }).catch(function () {
      // Revert on failure.
      currentFavorites = isFav
        ? currentFavorites.concat([cod])
        : currentFavorites.filter(function (c) { return c !== cod; });
      window.syncFavoriteHearts();
    });
  });
})();
