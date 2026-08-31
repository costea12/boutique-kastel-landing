// "Am uitat parola" page - sends a Firebase password reset email to whatever
// address the visitor enters, if an account exists for it. Firebase itself
// stays silent on whether the email is registered (avoids leaking which
// emails have accounts), so we show the same success message either way.
(function () {
  const form = document.getElementById('forgotPasswordForm');
  const errorEl = document.getElementById('forgotError');
  const noteEl = document.getElementById('forgotNote');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;
    noteEl.hidden = true;

    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Se trimite...';

    firebase.auth().sendPasswordResetEmail(email)
      .then(function () {
        form.reset();
        noteEl.textContent = 'Dacă există un cont cu această adresă, ți-am trimis un email cu instrucțiuni de resetare a parolei. Verifică și folderul de spam.';
        noteEl.hidden = false;
      })
      .catch(function (err) {
        // Firebase throws auth/invalid-email for a malformed address, but
        // we deliberately show the same generic message for auth/user-not-found
        // so nobody can use this form to check which emails have accounts.
        if (err.code === 'auth/invalid-email') {
          errorEl.textContent = 'Adresa de email introdusă nu este validă.';
          errorEl.hidden = false;
        } else {
          form.reset();
          noteEl.textContent = 'Dacă există un cont cu această adresă, ți-am trimis un email cu instrucțiuni de resetare a parolei. Verifică și folderul de spam.';
          noteEl.hidden = false;
        }
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Trimite link de resetare';
      });
  });
})();
