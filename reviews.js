// Product reviews - one shared Firestore collection ("reviews"), each doc
// tagged with the product's "cod" and filtered client-side (avoids needing a
// composite index for a where+orderBy query). Public read, login-gated write,
// same login-gate pattern as favorites/checkout elsewhere on the site.
(function () {
  const section = document.getElementById('reviewsSection');
  if (!section || !window.firebase || !firebase.auth) return;

  const params = new URLSearchParams(window.location.search);
  const cod = params.get('cod');
  if (!cod) return;

  const auth = firebase.auth();
  const db = firebase.firestore();

  // Collapsed by default - only the heading + arrow show until tapped.
  const toggle = document.getElementById('reviewsToggle');
  const body = document.getElementById('reviewsBody');
  toggle?.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.classList.toggle('is-open', !expanded);
    body.hidden = expanded;
  });

  const avgWrap = document.getElementById('reviewsAverage');
  const avgStarsEl = document.getElementById('reviewsAverageStars');
  const avgValueEl = document.getElementById('reviewsAverageValue');
  const listEl = document.getElementById('reviewsList');
  const emptyEl = document.getElementById('reviewsEmpty');
  const loginPrompt = document.getElementById('reviewLoginPrompt');
  const form = document.getElementById('reviewForm');
  const starInput = document.getElementById('reviewStarInput');
  const starButtons = starInput ? Array.from(starInput.querySelectorAll('button')) : [];
  const textInput = document.getElementById('reviewText');
  const note = document.getElementById('reviewFormNote');

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function starsHtml(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star${i <= rating ? ' is-filled' : ''}">★</span>`;
    }
    return html;
  }

  function renderReviews(reviews) {
    if (!reviews.length) {
      emptyEl.hidden = false;
      listEl.innerHTML = '';
      avgWrap.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    avgWrap.hidden = false;
    avgStarsEl.innerHTML = starsHtml(Math.round(avg));
    avgValueEl.textContent = avg.toFixed(1).replace('.', ',');

    listEl.innerHTML = reviews.map((r) => {
      const date = r.createdAt ? r.createdAt.toDate().toLocaleDateString('ro-RO') : '';
      return `
        <div class="review-item">
          <div class="review-item-top">
            <span class="review-stars">${starsHtml(r.rating)}</span>
            <span class="review-author">${escapeHtml(r.authorName)}</span>
            ${date ? `<span class="review-date">${date}</span>` : ''}
          </div>
          <p class="review-text">${escapeHtml(r.text)}</p>
        </div>
      `;
    }).join('');
  }

  function loadReviews() {
    db.collection('reviews').where('cod', '==', cod).get()
      .then((snap) => {
        const reviews = snap.docs.map((d) => d.data());
        reviews.sort((a, b) => (b.createdAt ? b.createdAt.toMillis() : 0) - (a.createdAt ? a.createdAt.toMillis() : 0));
        renderReviews(reviews);
      })
      .catch(() => {
        // Reviews unreachable (rules not published yet, offline, etc.) -
        // fail quiet into the empty state rather than showing an error.
        emptyEl.hidden = false;
        listEl.innerHTML = '';
      });
  }

  let selectedRating = 0;
  function paintStars(n) {
    starButtons.forEach((b) => b.classList.toggle('is-selected', parseInt(b.dataset.star, 10) <= n));
  }
  starButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.star, 10);
      paintStars(selectedRating);
    });
    btn.addEventListener('mouseenter', () => paintStars(parseInt(btn.dataset.star, 10)));
  });
  starInput?.addEventListener('mouseleave', () => paintStars(selectedRating));

  auth.onAuthStateChanged((user) => {
    if (user) {
      loginPrompt.hidden = true;
      form.hidden = false;
    } else {
      loginPrompt.hidden = false;
      form.hidden = true;
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    note.hidden = true;
    const user = auth.currentUser;
    if (!user) return;

    if (!selectedRating) {
      note.textContent = 'Te rugăm alege un număr de stele.';
      note.hidden = false;
      return;
    }
    const text = textInput.value.trim();
    if (!text) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Se trimite...';

    db.collection('reviews').add({
      cod: cod,
      rating: selectedRating,
      text: text,
      authorName: user.displayName || 'Client Boutique Kastel',
      authorUid: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(() => {
      textInput.value = '';
      selectedRating = 0;
      paintStars(0);
      note.textContent = 'Mulțumim pentru recenzie!';
      note.hidden = false;
      loadReviews();
    }).catch(() => {
      note.textContent = 'A apărut o eroare. Te rugăm încearcă din nou.';
      note.hidden = false;
    }).finally(() => {
      btn.disabled = false;
      btn.textContent = 'Trimite recenzia';
    });
  });

  loadReviews();
})();
