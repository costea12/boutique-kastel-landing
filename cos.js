// Cart / checkout page logic - extracted out of cos.html's inline <script>
// so the site can run under a strict CSP with no 'unsafe-inline' on
// script-src. Behavior unchanged.

function formatPrice(p) { return `${p.toFixed(2).replace('.', ',')} Lei`; }

// Same helper duplicated in cont.js/panou-admin.js - cart items and the
// saved shipping address are still someone-controlled data being built into
// innerHTML, even though today they only ever come from this site's own
// catalog.json / the account owner's own form. Escape anyway, matching the
// policy used everywhere else this kind of data gets rendered.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderCart() {
  const cart = getCart();
  const el = document.getElementById('cartContents');
  const countEl = document.getElementById('cartHeadingCount');
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);
  if (countEl) countEl.textContent = itemCount ? `${itemCount} ${itemCount === 1 ? 'produs' : 'produse'}` : '';

  if (cart.length === 0) {
    el.innerHTML = '<p class="cart-empty">Coșul tău este gol. <a href="parfumuri.html">Vezi parfumurile</a></p>';
    return;
  }

  el.innerHTML = `
    <div class="cart-items">
      ${cart.map((item) => `
        <div class="cart-item">
          <a href="produs.html?cod=${encodeURIComponent(item.cod)}" class="cart-item-link">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
            <div class="cart-item-info">
              <h4>${escapeHtml(item.name)}</h4>
              <span>${formatPrice(item.price)} / buc</span>
            </div>
          </a>
          <div class="qty-control qty-control-sm" data-cod="${item.cod}">
            <button type="button" class="qty-minus" aria-label="Scade cantitatea">−</button>
            <input type="number" class="qty-input" value="${item.qty}" min="1">
            <button type="button" class="qty-plus" aria-label="Crește cantitatea">+</button>
          </div>
          <span class="cart-item-total">${formatPrice(item.price * item.qty)}</span>
          <button class="cart-item-remove" data-cod="${item.cod}" aria-label="Elimină">✕</button>
        </div>
      `).join('')}
    </div>
    <div class="cart-breakdown">
      <div class="cart-breakdown-line">
        <span>Subtotal</span>
        <span>${formatPrice(cartTotal())}</span>
      </div>
      <div class="cart-breakdown-line">
        <span>Livrare</span>
        <span class="cart-breakdown-tbd">se calculează la finalizare</span>
      </div>
    </div>
    <div class="cart-summary">
      <span>Total</span>
      <strong>${formatPrice(cartTotal())}</strong>
    </div>
    <div id="checkoutAddress"></div>
    <button class="btn btn-cart" id="checkoutBtn">Finalizează comanda</button>
    <p class="cart-note">Plata online va fi disponibilă în curând - comanda ta va fi confirmată telefonic. Trebuie să fii autentificat pentru a plasa o comandă. Sau sună direct la <a href="tel:0744377651">0744 377 651</a>.</p>
  `;

  document.getElementById('checkoutBtn')?.addEventListener('click', handleCheckout);
  renderAddressBlock();

  el.querySelectorAll('.cart-item-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.cod);
      renderCart();
    });
  });

  el.querySelectorAll('.qty-control').forEach((control) => {
    const cod = control.dataset.cod;
    const input = control.querySelector('.qty-input');
    control.querySelector('.qty-minus').addEventListener('click', () => {
      setQty(cod, Math.max(0, parseInt(input.value || '1') - 1));
      renderCart();
    });
    control.querySelector('.qty-plus').addEventListener('click', () => {
      setQty(cod, parseInt(input.value || '1') + 1);
      renderCart();
    });
    input.addEventListener('change', () => {
      setQty(cod, Math.max(0, parseInt(input.value || '1')));
      renderCart();
    });
  });
}

// Shipping address review at checkout - shows the address already saved on
// the account (cont.html) read-only, with an "Editează" button to change it
// inline for this order, instead of silently using whatever's on file or
// bouncing the customer to a separate page. Writes go to the same
// users/{uid} doc that cont.html's address form uses, so both stay in sync.
let addressState = { user: null, data: null, editing: false };

const ADDRESS_FIELDS = [
  { key: 'shipName', label: 'Nume complet', type: 'text' },
  { key: 'shipPhone', label: 'Telefon', type: 'tel' },
  { key: 'shipAddress', label: 'Adresă', type: 'text' },
  { key: 'shipCity', label: 'Oraș', type: 'text' },
  { key: 'shipCounty', label: 'Județ', type: 'text' },
  { key: 'shipPostalCode', label: 'Cod poștal', type: 'text' },
  { key: 'shipCountry', label: 'Țară', type: 'text' },
];

function hasCompleteAddress(d) {
  return !!d && ADDRESS_FIELDS.every((f) => d[f.key] && d[f.key].trim());
}

function renderAddressBlock() {
  const el = document.getElementById('checkoutAddress');
  if (!el) return; // cart is empty, nothing to show

  if (!addressState.user) {
    el.innerHTML = '';
    return;
  }

  const d = addressState.data || {};
  const complete = hasCompleteAddress(d);

  if (addressState.editing || !complete) {
    el.innerHTML = `
      <div class="checkout-address">
        <h3>Adresă de livrare</h3>
        <form class="account-form" id="checkoutAddressForm">
          ${ADDRESS_FIELDS.map((f) => `
            <label>
              <span>${f.label}</span>
              <input type="${f.type}" id="ca-${f.key}" value="${escapeHtml(d[f.key] || '')}" required>
            </label>
          `).join('')}
          <div class="checkout-address-actions">
            <button type="submit" class="btn btn-outline">Salvează adresa</button>
            ${complete ? '<button type="button" class="btn-text" id="checkoutAddressCancel">Anulează</button>' : ''}
          </div>
        </form>
      </div>
    `;
    document.getElementById('checkoutAddressForm').addEventListener('submit', saveCheckoutAddress);
    document.getElementById('checkoutAddressCancel')?.addEventListener('click', () => {
      addressState.editing = false;
      renderAddressBlock();
    });
  } else {
    el.innerHTML = `
      <div class="checkout-address checkout-address-view">
        <h3>Adresă de livrare</h3>
        <address>
          ${escapeHtml(d.shipName)}<br>
          ${escapeHtml(d.shipAddress)}, ${escapeHtml(d.shipCity)}, ${escapeHtml(d.shipCounty)}, ${escapeHtml(d.shipPostalCode)}<br>
          ${escapeHtml(d.shipCountry)} &middot; ${escapeHtml(d.shipPhone)}
        </address>
        <button type="button" class="btn-text" id="checkoutAddressEdit">Editează</button>
      </div>
    `;
    document.getElementById('checkoutAddressEdit').addEventListener('click', () => {
      addressState.editing = true;
      renderAddressBlock();
    });
  }
}

function saveCheckoutAddress(e) {
  e.preventDefault();
  const user = addressState.user;
  if (!user) return;

  const address = {};
  ADDRESS_FIELDS.forEach((f) => {
    address[f.key] = document.getElementById(`ca-${f.key}`).value.trim();
  });

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Se salvează...'; }

  firebase.firestore().collection('users').doc(user.uid).set(address, { merge: true }).then(() => {
    addressState.data = Object.assign({}, addressState.data, address);
    addressState.editing = false;
    renderAddressBlock();
  }).catch(() => {
    if (btn) { btn.disabled = false; btn.textContent = 'Salvează adresa'; }
    alert('Nu am putut salva adresa. Încearcă din nou.');
  });
}

firebase.auth().onAuthStateChanged((user) => {
  addressState.user = user;
  addressState.data = null;
  addressState.editing = false;
  if (!user) { renderAddressBlock(); return; }
  firebase.firestore().collection('users').doc(user.uid).get().then((doc) => {
    addressState.data = doc.data() || {};
    renderAddressBlock();
  });
});

function handleCheckout() {
  const user = firebase.auth().currentUser;
  if (!user) {
    // Not logged in - an account is required to place an order. Cart stays in
    // localStorage, so nothing is lost while they log in / sign up.
    window.location.href = 'cont.html';
    return;
  }

  const cart = getCart();
  if (cart.length === 0) return;

  // Safety net for the age check: produs.js already hides the "add to cart"
  // button for alcohol (category "ALC") once someone has confirmed they're
  // under 18, but if an item somehow ended up in the cart anyway (e.g.
  // added before answering the age gate), block it here too rather than
  // trusting only the earlier UI gate.
  if (window.bkIsMinor && window.bkIsMinor() && cart.some((i) => i.category === 'ALC')) {
    document.getElementById('cartContents').insertAdjacentHTML('beforeend',
      '<p class="age-restricted-notice">🔞 Coșul conține produse cu conținut alcoolic, iar contul tău e marcat sub 18 ani. Elimină aceste produse din coș pentru a putea finaliza comanda.</p>');
    return;
  }

  const btn = document.getElementById('checkoutBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Se trimite...'; }

  const db = firebase.firestore();
  db.collection('users').doc(user.uid).get().then(function (doc) {
    const d = doc.data() || {};
    const required = ['shipName', 'shipPhone', 'shipAddress', 'shipCity', 'shipCounty', 'shipPostalCode', 'shipCountry'];
    const hasAddress = required.every((k) => d[k] && d[k].trim());

    if (!hasAddress) {
      if (btn) { btn.disabled = false; btn.textContent = 'Finalizează comanda'; }
      document.getElementById('cartContents').insertAdjacentHTML('beforeend',
        '<p class="cart-address-warning">Completează adresa de livrare din <a href="cont.html">contul tău</a> înainte de a plasa comanda.</p>');
      return null;
    }

    // Order numbers are a simple shared counter (counters/orders, field
    // "count"), incremented atomically in a transaction so two checkouts at
    // the same instant never get the same number.
    const counterRef = db.collection('counters').doc('orders');
    const orderRef = db.collection('users').doc(user.uid).collection('orders').doc();

    return db.runTransaction(function (t) {
      return t.get(counterRef).then(function (counterDoc) {
        const next = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
        t.set(counterRef, { count: next }, { merge: true });
        t.set(orderRef, {
          orderNumber: next,
          items: cart.map((i) => ({ cod: i.cod, name: i.name, price: i.price, qty: i.qty })),
          total: cartTotal(),
          status: 'noua',
          customerName: user.displayName || '',
          customerEmail: user.email,
          shipping: {
            name: d.shipName, phone: d.shipPhone, address: d.shipAddress,
            city: d.shipCity, county: d.shipCounty, postalCode: d.shipPostalCode,
            country: d.shipCountry, notes: d.shipNotes || '',
          },
          // Company invoice details, only set when the customer checked "Doresc
          // factură pe firmă" in cont.html. Used later to generate a real
          // factură (SmartBill/Oblio/etc.) instead of a persoană fizică one.
          billing: d.isCompanyOrder ? {
            isCompanyOrder: true,
            companyName: d.companyName || '',
            companyCUI: d.companyCUI || '',
            companyRegCom: d.companyRegCom || '',
            companyAddress: d.companyAddress || d.shipAddress,
          } : { isCompanyOrder: false },
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { orderNumber: next, orderId: orderRef.id };
      });
    });
  }).then(function (result) {
    if (!result) return;
    const { orderNumber, orderId } = result;
    clearCart();
    const numberLabel = String(orderNumber).padStart(4, '0');
    document.getElementById('cartContents').innerHTML = `
      <div class="cart-confirm-block">
        <h2>Comanda #${numberLabel} a fost înregistrată!</h2>
        <p>Îți mulțumim! Te vom contacta telefonic pentru confirmarea comenzii și modalitatea de plată.</p>
        <a href="cont.html" class="btn btn-outline">Vezi istoricul comenzilor</a>
      </div>
    `;
    // Confirmation email, sent server-side (see vercel-api/api/send-order-email.js)
    // so it doesn't depend on this tab staying open. Fire-and-forget: a
    // failed email must never block or roll back an order that's already
    // safely in Firestore.
    user.getIdToken().then(function (idToken) {
      fetch('https://boutique-kastel-api.vercel.app/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId }),
      }).catch(function () { /* logged server-side; never surfaced to the customer */ });
    });
  }).catch(function () {
    if (btn) { btn.disabled = false; btn.textContent = 'Finalizează comanda'; }
    alert('A apărut o eroare la trimiterea comenzii. Te rugăm încearcă din nou sau sună-ne la 0744 377 651.');
  });
}

renderCart();
