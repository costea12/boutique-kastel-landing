// Contact form (mobile nav "Contact" block) - sends via EmailJS, which works
// straight from any visitor's browser with no server of our own involved.
// Fill in the three constants below once the EmailJS account (connected to
// boutiquekasteldutyfreeconcept@gmail.com) exists - see emailjs.com. Until then the form
// shows a friendly fallback instead of pretending to send.
(function () {
  const EMAILJS_PUBLIC_KEY = '9Mbki2DmUiHBnyM4V';
  const EMAILJS_SERVICE_ID = 'service_c4mndvh';
  const EMAILJS_TEMPLATE_ID = 'template_e7fvgyl';

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
      note.textContent = 'Formularul nu este încă activat. Te rugăm scrie-ne direct la boutiquekasteldutyfreeconcept@gmail.com.';
      note.hidden = false;
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    btn.disabled = true;
    btn.textContent = 'Se trimite...';

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      // Matches the "Contact Us" EmailJS template's placeholders
      // ({{name}}, {{email}}, {{message}}, {{title}}, {{time}}). The form
      // only collects an email, so it doubles as the "name" shown too.
      name: email,
      email: email,
      message: message,
      title: 'Mesaj nou de pe site',
      time: new Date().toLocaleString('ro-RO'),
    }).then(function () {
      form.reset();
      note.textContent = 'Mesajul a fost trimis! Îți vom răspunde cât mai curând.';
      note.hidden = false;
    }).catch(function () {
      note.textContent = 'A apărut o eroare. Te rugăm scrie-ne direct la boutiquekasteldutyfreeconcept@gmail.com.';
      note.hidden = false;
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = 'Trimite';
    });
  });
})();
