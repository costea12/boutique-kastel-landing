// Standalone return form (retur.html) - works for any visitor, no account/login
// needed. Sends via the same EmailJS account already wired up for contact-form.js.
(function () {
  const EMAILJS_PUBLIC_KEY = '9Mbki2DmUiHBnyM4V';
  const EMAILJS_SERVICE_ID = 'service_c4mndvh';
  const EMAILJS_TEMPLATE_ID = 'template_e7fvgyl';

  const form = document.getElementById('returnForm');
  const note = document.getElementById('returnFormNote');
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
    const name = document.getElementById('returnName').value.trim();
    const email = document.getElementById('returnEmail').value.trim();
    const orderNumber = document.getElementById('returnOrderNumber').value.trim();
    const product = document.getElementById('returnProduct').value.trim();
    const orderDate = document.getElementById('returnOrderDate').value.trim();
    const receivedDate = document.getElementById('returnReceivedDate').value.trim();
    const address = document.getElementById('returnAddress').value.trim();
    const iban = document.getElementById('returnIban').value.trim();

    const message = [
      'CERERE DE RETRAGERE (formular standard)',
      '',
      `Produs(e): ${product}`,
      `Comandat la: ${orderDate || '-'}`,
      `Primit la: ${receivedDate || '-'}`,
      `Număr comandă: ${orderNumber}`,
      `Nume consumator: ${name}`,
      `Adresă consumator: ${address || '-'}`,
      `IBAN pentru rambursare: ${iban || '- (se va stabili prin contact)'}`,
    ].join('\n');

    btn.disabled = true;
    btn.textContent = 'Se trimite...';

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      name: name,
      email: email,
      message: message,
      title: 'Cerere de retur de pe site',
      time: new Date().toLocaleString('ro-RO'),
    }).then(function () {
      form.reset();
      note.textContent = 'Cererea de retur a fost trimisă! Îți vom confirma prin email cât mai curând.';
      note.hidden = false;
    }).catch(function () {
      note.textContent = 'A apărut o eroare. Te rugăm scrie-ne direct la boutiquekasteldutyfreeconcept@gmail.com.';
      note.hidden = false;
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = 'Trimite cererea de retur';
    });
  });
})();
