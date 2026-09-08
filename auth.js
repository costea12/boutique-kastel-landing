// Sitewide auth state -> header "Cont" icon + mobile sidebar footer.
// Loaded on every page (after firebase-config.js). Keeps the header icon's
// tooltip in sync with whether someone is logged in, and links to cont.html
// either way (cont.html itself shows login/signup or the account dashboard).
(function () {
  if (!window.firebase || !firebase.auth) return;

  const navName = document.getElementById('mobileNavName');
  const navEmail = document.getElementById('mobileNavEmail');
  const navAvatar = document.getElementById('mobileNavAvatar');

  firebase.auth().onAuthStateChanged(function (user) {
    const btn = document.getElementById('accountBtn');
    if (btn) {
      const tooltip = btn.querySelector('.tooltip');
      if (user) {
        if (tooltip) tooltip.textContent = 'Contul meu';
        btn.classList.add('is-logged-in');
      } else {
        if (tooltip) tooltip.textContent = 'Autentificare';
        btn.classList.remove('is-logged-in');
      }
    }

    if (navName && navEmail && navAvatar) {
      if (user) {
        const label = user.displayName || user.email || 'Contul meu';
        navName.textContent = label;
        navEmail.textContent = user.email || '';
        navAvatar.textContent = label.trim().charAt(0).toUpperCase();
      } else {
        navName.textContent = 'Autentificare';
        navEmail.textContent = 'Intră în contul tău';
        navAvatar.textContent = '?';
      }
    }
  });
})();
