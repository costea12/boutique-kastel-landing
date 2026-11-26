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

// Inline line icons for the checkout (same 1.6 stroke as the rest of the site).
const ICON = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  bag: ICON('<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>'),
  trash: ICON('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  card: ICON('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>'),
  cash: ICON('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>'),
  lock: ICON('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  return: ICON('<path d="M4 9h11a5 5 0 0 1 0 10H8"/><path d="M8 5 4 9l4 4"/>'),
  phone: ICON('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  truck: ICON('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>'),
  pin: ICON('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  user: ICON('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
};

// Checkout warnings land next to the order button, where the customer is
// looking, instead of below the whole page.
function showCheckoutMessage(html) {
  const box = document.getElementById('checkoutMessages') || document.getElementById('cartContents');
  box.insertAdjacentHTML('beforeend', html);
}

// notices: stock adjustments from refreshCartStock(), shown above the items.
function renderCart(notices = []) {
  const cart = getCart();
  const el = document.getElementById('cartContents');
  // Re-rendering rebuilds the payment radios - keep the customer's choice.
  const chosenPayment = document.querySelector('input[name="paymentMethod"]:checked')?.value;
  const countEl = document.getElementById('cartHeadingCount');
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);
  if (countEl) countEl.textContent = itemCount ? `${itemCount} ${itemCount === 1 ? 'produs' : 'produse'}` : '';

  if (cart.length === 0) {
    el.innerHTML = notices.map((n) => `<p class="cart-address-warning cart-stock-notice">${escapeHtml(n)}</p>`).join('') + `
      <div class="co-empty">
        <span class="co-empty-icon">${ICONS.bag}</span>
        <h2>Coșul tău este gol</h2>
        <p>Alege un parfum, ceva de îngrijire sau un dulce de la noi.</p>
        <a href="parfumuri.html" class="co-cta co-cta-inline">Vezi parfumurile</a>
      </div>`;
    return;
  }

  el.innerHTML = `
    ${notices.map((n) => `<p class="cart-address-warning cart-stock-notice">${escapeHtml(n)}</p>`).join('')}
    <div class="co-grid">
      <div class="co-main">
        <section class="co-card" aria-labelledby="coItemsTitle">
          <h2 class="co-title" id="coItemsTitle"><span class="co-step">1</span> Produsele tale</h2>
          <ul class="co-items">
            ${cart.map((item) => `
              <li class="co-item">
                <a href="produs.html?cod=${encodeURIComponent(item.cod)}" class="co-item-img">
                  <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">
                </a>
                <div class="co-item-body">
                  <div class="co-item-top">
                    <a href="produs.html?cod=${encodeURIComponent(item.cod)}" class="co-item-name">${escapeHtml(item.name)}</a>
                    <span class="co-item-total">${formatPrice(item.price * item.qty)}</span>
                  </div>
                  <span class="co-item-unit">${formatPrice(item.price)} / buc</span>
                  <div class="co-item-actions">
                    <div class="qty-control co-qty" data-cod="${item.cod}">
                      <button type="button" class="qty-minus" aria-label="Scade cantitatea">−</button>
                      <input type="number" class="qty-input" value="${item.qty}" min="1" aria-label="Cantitate"${typeof item.stock === 'number' ? ` max="${item.stock}"` : ''}>
                      <button type="button" class="qty-plus" aria-label="Crește cantitatea"${typeof item.stock === 'number' && item.qty >= item.stock ? ' disabled title="Stoc maxim atins"' : ''}>+</button>
                    </div>
                    <button type="button" class="cart-item-remove co-remove" data-cod="${item.cod}">${ICONS.trash}<span>Șterge</span></button>
                  </div>
                </div>
              </li>
            `).join('')}
          </ul>
        </section>

        <section class="co-card" aria-labelledby="coShipTitle">
          <h2 class="co-title" id="coShipTitle"><span class="co-step">2</span> Livrare</h2>
          <div id="checkoutAddress"></div>
        </section>

        <section class="co-card" aria-labelledby="coPayTitle">
          <h2 class="co-title" id="coPayTitle"><span class="co-step">3</span> Plata</h2>
          <div class="co-pay" role="radiogroup" aria-labelledby="coPayTitle">
            <label class="payment-method-option co-pay-option">
              <input type="radio" name="paymentMethod" value="card" checked>
              <span class="co-pay-icon">${ICONS.card}</span>
              <span class="co-pay-text"><strong>Card online</strong><small>Plată securizată prin NETOPIA</small></span>
            </label>
            <label class="payment-method-option co-pay-option">
              <input type="radio" name="paymentMethod" value="ramburs">
              <span class="co-pay-icon">${ICONS.cash}</span>
              <span class="co-pay-text"><strong>Ramburs</strong><small>Plătești curierului, la livrare</small></span>
            </label>
          </div>
        </section>
      </div>

      <aside class="co-summary" aria-labelledby="coSumTitle">
        <h2 class="co-title" id="coSumTitle">Sumar</h2>
        <div class="co-lines">
          <div class="co-line"><span>Produse</span><span>${formatPrice(cartTotal())}</span></div>
          ${cartSgrTotal() > 0 ? `<div class="co-line"><span>Garanție SGR</span><span>${formatPrice(cartSgrTotal())}</span></div>` : ''}
          <div class="co-line"><span>Livrare</span><span class="cart-breakdown-tbd" id="shippingFeeLine">completează adresa de livrare</span></div>
        </div>
        <div class="co-total"><span>Total</span><strong id="cartTotalLine">${formatPrice(cartTotal() + cartSgrTotal())}</strong></div>
        <div id="checkoutMessages" aria-live="polite"></div>
        <button type="button" class="co-cta" id="checkoutBtn">Comandă cu obligație de plată</button>
        <div class="co-badges"><img src="assets/netopia-logo.svg" width="209" height="38" alt="Plăți securizate NETOPIA Payments, Visa și Mastercard"></div>
        <ul class="co-trust">
          <li>${ICONS.lock}<span>Plată securizată: datele cardului le introduci doar pe pagina NETOPIA, nu trec prin site-ul nostru</span></li>
          <li>${ICONS.truck}<span>Livrare prin FAN Courier în toată țara</span></li>
          <li>${ICONS.return}<span>Retur în 14 zile, conform <a href="retur.html">politicii de retur</a></span></li>
          <li>${ICONS.phone}<span>Ai o întrebare? Sună-ne la <a href="tel:0744377651">0744&nbsp;377&nbsp;651</a></span></li>
        </ul>
        <p class="co-fineprint">Pentru a plasa o comandă trebuie să fii autentificat în contul tău.</p>
      </aside>
    </div>
  `;

  if (chosenPayment) {
    const radio = el.querySelector(`input[name="paymentMethod"][value="${chosenPayment}"]`);
    if (radio) radio.checked = true;
  }
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
let addressState = { user: null, data: null, editing: false, authReady: false };

// Real shipping cost from FAN Courier (vercel-api/api/estimate-shipping.js),
// fetched once the address is complete. The shop no longer absorbs this -
// it's charged to the customer as part of the order total, same price FAN
// will actually collect/bill. fetchId guards against a stale response
// (e.g. from before the customer switched payment method) overwriting a
// newer one that resolves first.
let shippingFee = null;
let shippingFeeFetchId = 0;

function updateTotalsDisplay() {
  const feeEl = document.getElementById('shippingFeeLine');
  const totalEl = document.getElementById('cartTotalLine');
  if (!feeEl || !totalEl) return;
  if (shippingFee == null) {
    feeEl.textContent = hasCompleteAddress(addressState.data) ? 'se calculează...' : 'completează adresa de livrare';
    feeEl.classList.add('cart-breakdown-tbd');
  } else {
    feeEl.textContent = formatPrice(shippingFee);
    feeEl.classList.remove('cart-breakdown-tbd');
  }
  totalEl.textContent = formatPrice(cartTotal() + cartSgrTotal() + (shippingFee || 0));
}

function fetchShippingEstimate() {
  const d = addressState.data;
  const user = addressState.user;
  if (!user || !hasCompleteAddress(d)) {
    shippingFee = null;
    updateTotalsDisplay();
    return;
  }
  const paymentMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'card';
  const fetchId = ++shippingFeeFetchId;

  shippingFee = null;
  updateTotalsDisplay();

  user.getIdToken().then((idToken) => fetch('https://boutique-kastel-api.vercel.app/api/estimate-shipping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ county: d.shipCounty, city: d.shipCity, items: getCart(), paymentMethod }),
  })).then((res) => {
    if (!res.ok) throw new Error('estimate-failed');
    return res.json();
  }).then((data) => {
    if (fetchId !== shippingFeeFetchId) return; // a newer request already resolved
    shippingFee = data.shippingFee;
    updateTotalsDisplay();
  }).catch(() => {
    if (fetchId !== shippingFeeFetchId) return;
    const feeEl = document.getElementById('shippingFeeLine');
    if (feeEl) { feeEl.textContent = 'eroare - încearcă din nou'; feeEl.classList.add('cart-breakdown-tbd'); }
  });
}

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

  if (!addressState.authReady) {
    el.innerHTML = '<p class="co-muted">Se încarcă...</p>';
    return;
  }

  if (!addressState.user) {
    el.innerHTML = `
      <div class="co-login">
        <span class="co-login-icon">${ICONS.user}</span>
        <div>
          <p><strong>Intră în cont ca să plasezi comanda.</strong></p>
          <p class="co-muted">Adresa de livrare o completezi o singură dată, apoi o găsești aici la fiecare comandă. Coșul rămâne salvat.</p>
          <a href="cont.html" class="co-btn-outline">Intră în cont sau creează unul</a>
        </div>
      </div>`;
    return;
  }

  const d = addressState.data || {};
  const complete = hasCompleteAddress(d);

  if (addressState.editing || !complete) {
    el.innerHTML = `
      <div class="checkout-address">
        <form class="account-form co-form" id="checkoutAddressForm">
          ${ADDRESS_FIELDS.map((f) => {
            if (f.key === 'shipCounty') {
              const current = d[f.key] || '';
              const options = (window.RO_COUNTIES || []).map((county) => (
                `<option value="${escapeHtml(county)}" ${county === current ? 'selected' : ''}>${escapeHtml(county)}</option>`
              )).join('');
              return `
            <label>
              <span>${f.label}</span>
              <select id="ca-${f.key}" required>
                <option value="" disabled ${current ? '' : 'selected'}>Alege județul</option>
                ${options}
              </select>
            </label>
          `;
            }
            return `
            <label${f.key === 'shipAddress' ? ' class="co-field-wide"' : ''}>
              <span>${f.label}</span>
              <input type="${f.type}" id="ca-${f.key}" value="${escapeHtml(d[f.key] || '')}" required>
            </label>
          `;
          }).join('')}
          <div class="checkout-address-actions co-field-wide">
            <button type="submit" class="co-btn-outline">Salvează adresa</button>
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
      <div class="checkout-address checkout-address-view co-address">
        <span class="co-address-icon">${ICONS.pin}</span>
        <address>
          <strong>${escapeHtml(d.shipName)}</strong><br>
          ${escapeHtml(d.shipAddress)}, ${escapeHtml(d.shipCity)}, ${escapeHtml(d.shipCounty)}, ${escapeHtml(d.shipPostalCode)}<br>
          ${escapeHtml(d.shipCountry)} &middot; ${escapeHtml(d.shipPhone)}
        </address>
        <button type="button" class="co-link" id="checkoutAddressEdit">Editează</button>
      </div>
    `;
    document.getElementById('checkoutAddressEdit').addEventListener('click', () => {
      addressState.editing = true;
      renderAddressBlock();
    });
  }
  fetchShippingEstimate();
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
  addressState.authReady = true;
  addressState.data = null;
  addressState.editing = false;
  if (!user) { renderAddressBlock(); return; }
  firebase.firestore().collection('users').doc(user.uid).get().then((doc) => {
    addressState.data = doc.data() || {};
    renderAddressBlock();
  });
});

// Re-checks live stock right before the order is written, so a customer
// can't order more than the owner has (e.g. stock lowered in the admin
// panel while the cart sat open). Any adjustment stops checkout and shows
// the customer what changed instead of silently ordering a different qty.
function handleCheckout() {
  const btn = document.getElementById('checkoutBtn');
  if (btn) btn.disabled = true;
  refreshCartStock().then((changes) => {
    if (changes.length) {
      renderCart(changes);
      return;
    }
    if (btn) btn.disabled = false;
    placeOrder();
  });
}

function placeOrder() {
  const user = firebase.auth().currentUser;
  if (!user) {
    // Not logged in - an account is required to place an order. Cart stays in
    // localStorage, so nothing is lost while they log in / sign up.
    window.location.href = 'cont.html';
    return;
  }

  const paymentMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'ramburs';

  const cart = getCart();
  if (cart.length === 0) return;

  if (shippingFee == null) {
    showCheckoutMessage(
      '<p class="cart-address-warning">Completează adresa de livrare și așteaptă calcularea costului de transport înainte de a plasa comanda.</p>');
    return;
  }

  // Safety net for the age check: produs.js already hides the "add to cart"
  // button for alcohol (category "ALC") once someone has confirmed they're
  // under 18, but if an item somehow ended up in the cart anyway (e.g.
  // added before answering the age gate), block it here too rather than
  // trusting only the earlier UI gate.
  if (window.bkIsMinor && window.bkIsMinor() && cart.some((i) => i.category === 'ALC')) {
    showCheckoutMessage(
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
      if (btn) { btn.disabled = false; btn.textContent = 'Comandă cu obligație de plată'; }
      showCheckoutMessage(
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
          items: cart.map((i) => ({ cod: i.cod, name: i.name, price: i.price, qty: i.qty, image: i.image || '' })),
          subtotal: cartTotal(),
          sgrFee: cartSgrTotal(),
          shippingFee: shippingFee,
          total: cartTotal() + cartSgrTotal() + shippingFee,
          status: 'noua',
          paymentMethod: paymentMethod,
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

    // Confirmation email, sent server-side (see vercel-api/api/send-order-email.js)
    // so it doesn't depend on this tab staying open. Fire-and-forget: a
    // failed email must never block or roll back an order that's already
    // safely in Firestore. Only for ramburs: a card order is emailed by the
    // NETOPIA IPN handler once the payment is actually confirmed.
    if (paymentMethod !== 'card') {
      user.getIdToken().then(function (idToken) {
        fetch('https://boutique-kastel-api.vercel.app/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ orderId }),
        }).catch(function () { /* logged server-side; never surfaced to the customer */ });

        // AWB creation, same fire-and-forget pattern - safe to do now since
        // ramburs has no payment that could still fail. Card orders get
        // their AWB from the NETOPIA IPN handler after payment confirms,
        // never from here.
        fetch('https://boutique-kastel-api.vercel.app/api/create-order-awb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ orderId }),
        }).catch(function () { /* logged server-side; owner can create the AWB manually as a fallback */ });
      });
    }

    if (paymentMethod === 'card') {
      // Straight to NETOPIA. Nothing here says the order is "done": it
      // isn't until the payment is confirmed (plata-finalizata.html).
      document.getElementById('cartContents').innerHTML = `
        <div class="cart-confirm-block">
          <h2>Se procesează plata...</h2>
          <p>Te redirecționăm către pagina de plată securizată NETOPIA. Te rugăm nu închide această pagină.</p>
        </div>
      `;
      startCardPayment(orderId, null);
    } else {
      document.getElementById('cartContents').innerHTML = `
        <div class="cart-confirm-block">
          <h2>Comanda #${numberLabel} a fost înregistrată!</h2>
          <p>Îți mulțumim! Te vom contacta telefonic pentru confirmarea comenzii și modalitatea de plată.</p>
          <a href="cont.html" class="btn btn-outline">Vezi istoricul comenzilor</a>
        </div>
      `;
      // Without this, the confirmation can land below the fold (near the
      // footer) if the page was scrolled while filling in the address -
      // scroll it into view so "mulțumim" is the first thing visible.
      document.querySelector('.cart-confirm-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }).catch(function () {
    if (btn) { btn.disabled = false; btn.textContent = 'Comandă cu obligație de plată'; }
    alert('A apărut o eroare la trimiterea comenzii. Te rugăm încearcă din nou sau sună-ne la 0744 377 651.');
  });
}

// Calls start-netopia-payment (vercel-api), then auto-submits the returned
// encrypted payload as a hidden form POST to NETOPIA's own hosted payment
// page - we never see/handle the card number ourselves, NETOPIA's page
// does. See vercel-api/api/start-netopia-payment.js.
function startCardPayment(orderId, btn) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  if (btn) { btn.disabled = true; btn.textContent = 'Se redirecționează...'; }

  user.getIdToken().then(function (idToken) {
    return fetch('https://boutique-kastel-api.vercel.app/api/start-netopia-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ orderId }),
    });
  }).then(function (res) {
    if (!res.ok) throw new Error('payment-init-failed');
    return res.json();
  }).then(function (data) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = data.action;
    ['env_key', 'data', 'iv', 'cipher'].forEach(function (key) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = data[key];
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }).catch(function () {
    if (btn) { btn.disabled = false; btn.textContent = 'Plătește online cu cardul'; }
    else {
      document.getElementById('cartContents').innerHTML = `
        <div class="cart-confirm-block">
          <h2>Nu am putut porni plata online</h2>
          <p>Comanda ta este înregistrată, dar plata nu a pornit. Te contactăm telefonic pentru plată, sau sună-ne la <a href="tel:0744377651">0744 377 651</a>.</p>
          <a href="cont.html" class="btn btn-outline">Vezi istoricul comenzilor</a>
        </div>
      `;
    }
    alert('Nu am putut iniția plata online. Te rugăm încearcă din nou sau sună-ne la 0744 377 651.');
  });
}

// Delegated on the stable #cartContents element (its innerHTML gets
// replaced by renderCart, but the element itself doesn't), so this only
// needs attaching once rather than re-binding on every re-render.
document.getElementById('cartContents')?.addEventListener('change', (e) => {
  if (e.target.name === 'paymentMethod') fetchShippingEstimate();
});

renderCart();
refreshCartStock().then((changes) => renderCart(changes));
