// Sitewide auth state -> header "Cont" icon.
// Loaded on every page (after firebase-config.js). Keeps the header icon's
// tooltip in sync with whether someone is logged in, and links to cont.html
// either way (cont.html itself shows login/signup or the account dashboard).
(function () {
  if (!window.firebase || !firebase.auth) return;

  firebase.auth().onAuthStateChanged(function (user) {
    const btn = document.getElementById('accountBtn');
    if (!btn) return;
    const tooltip = btn.querySelector('.tooltip');
    if (user) {
      if (tooltip) tooltip.textContent = 'Contul meu';
      btn.classList.add('is-logged-in');
    } else {
      if (tooltip) tooltip.textContent = 'Autentificare';
      btn.classList.remove('is-logged-in');
    }
  });
})();
