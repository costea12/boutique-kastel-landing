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

function addToCart(cod, name, price, image, qty = 1) {
  const cart = getCart();
  const existing = cart.find((i) => i.cod === cod);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ cod, name, price, image, qty });
  }
  saveCart(cart);
}

function removeFromCart(cod) {
  saveCart(getCart().filter((i) => i.cod !== cod));
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}

function updateCartBadge() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cartCount();
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
