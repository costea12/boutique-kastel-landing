// Simple client-side cart (localStorage). No backend yet - this just tracks what the
// visitor wants to buy; a real stock check + payment happens at checkout once the n8n
// backend exists. Shared by every page that shows a cart icon or an add-to-cart button.
const CART_KEY = 'kastel_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

// category is optional (only produs.js passes it) - used by the age-gate
// checkout safety net to catch alcohol items (category "Băuturi") without
// needing a separate catalog lookup at checkout time.
// Stock (set by the owner in the admin panel, on top of catalog.json) caps
// how many of one product can be in the cart. Items remember the stock they
// were added with; refreshCartStock() re-reads the live value on the cart
// page and again right before checkout.
function stockCap(stock) {
  return typeof stock === 'number' && stock >= 0 ? stock : Infinity;
}

// Returns { qty: final qty in cart, capped: true if the request was cut down }.
function addToCart(cod, name, price, image, qty = 1, category, stock) {
  const cart = getCart();
  const existing = cart.find((i) => i.cod === cod);
  const item = existing || { cod, name, price, image, qty: 0, category };
  if (typeof stock === 'number') item.stock = stock;
  const wanted = item.qty + qty;
  item.qty = Math.min(wanted, stockCap(item.stock));
  if (!existing && item.qty > 0) cart.push(item);
  saveCart(cart);
  return { qty: item.qty, capped: item.qty < wanted };
}

function removeFromCart(cod) {
  saveCart(getCart().filter((i) => i.cod !== cod));
}

function setQty(cod, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.cod === cod);
  if (!item) return;
  if (qty <= 0) {
    saveCart(cart.filter((i) => i.cod !== cod));
    return;
  }
  item.qty = Math.min(qty, stockCap(item.stock));
  saveCart(cart);
}

// Re-reads live stock/availability (catalog.json + admin overrides) for
// everything in the cart, clamps quantities, drops products that are sold
// out or taken off sale. Resolves to a list of human-readable changes (empty
// if nothing changed). Fails open: if the catalog can't be loaded, the cart
// is left as is.
function refreshCartStock() {
  const cart = getCart();
  if (!cart.length) return Promise.resolve([]);
  return fetch('catalog.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then((data) => (window.applyProductOverrides ? applyProductOverrides(data) : data))
    .then((products) => {
      const byCod = new Map(products.map((p) => [p.cod, p]));
      const changes = [];
      const next = [];
      cart.forEach((item) => {
        const p = byCod.get(item.cod);
        const stock = p ? p.stock : 0;
        if (!p || stock <= 0) {
          changes.push(`„${item.name}” nu mai este în stoc și a fost scos din coș.`);
          return;
        }
        item.stock = stock;
        if (item.qty > stock) {
          changes.push(`„${item.name}”: mai sunt doar ${stock} buc. în stoc, am ajustat cantitatea.`);
          item.qty = stock;
        }
        next.push(item);
      });
      saveCart(next);
      return changes;
    })
    .catch(() => []);
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}

// SGR (Sistem Garanție-Returnare) - the mandatory 0.50 lei deposit on
// returnable beverage containers (law since Dec 2023). Detected from the
// product name, which already carries "SGR" for every eligible item - same
// helper duplicated server-side in vercel-api/lib/pricing.js, since the
// client-side total is only a preview; the server recomputes it for real.
const SGR_FEE = 0.5;
function isSgrItem(name) { return /\bSGR\b/i.test(name || ''); }
function cartSgrTotal() {
  return getCart().reduce((sum, i) => sum + (isSgrItem(i.name) ? SGR_FEE * i.qty : 0), 0);
}

function updateCartBadge() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cartCount();
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
