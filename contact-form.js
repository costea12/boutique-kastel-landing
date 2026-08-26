// Contact form (mobile nav "Contact" block) - sends via EmailJS, which works
// straight from any visitor's browser with no server of our own involved.
// Fill in the three constants below once the EmailJS account (connected to
// contact@kastelboutique.ro) exists - see emailjs.com. Until then the form
// shows a friendly fallback instead of pretending to send.
(function () {
  const EMAILJS_PUBLIC_KEY = '';
  const EMAILJS_SERVICE_ID = '';
  const EMAILJS_TEMPLATE_ID = '';

  const form = document.getElementById('contactForm');
  const note = document.getElementById('contactNote');
  if (!form) return;

  if (EMAILJS_PUBLIC_KEY && window.emailjs) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    note.hidden = true;

    if (!EMAILJS_PUBLIC_KEY || !window.emailjs) {
      note.textContent = 'Formularul nu este încă activat. Te rugăm scrie-ne direct la contact@kastelboutique.ro.';
      note.hidden = false;
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    btn.disabled = true;
    btn.textContent = 'Se trimite...';

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      from_email: email,
      message: message,
    }).then(function () {
      form.reset();
      note.textContent = 'Mesajul a fost trimis! Îți vom răspunde cât mai curând.';
      note.hidden = false;
    }).catch(function () {
      note.textContent = 'A apărut o eroare. Te rugăm scrie-ne direct la contact@kastelboutique.ro.';
      note.hidden = false;
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = 'Trimite';
    });
  });
})();
