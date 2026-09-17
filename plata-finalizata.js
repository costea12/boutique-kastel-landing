// Landing page after NETOPIA's hosted payment page redirects back. The
// browser return alone is never trustworthy proof of payment (see
// vercel-api/api/netopia-ipn.js) - NETOPIA's server-to-server IPN is the
// real source of truth for paymentStatus in Firestore. This page just
// polls that field for a few seconds so the customer isn't stuck staring
// at "processing" if the IPN is instant, while still coping if it's a
// little slower than the redirect.

function getOrderIdFromUrl() {
  return new URLSearchParams(window.location.search).get('order');
}

function renderStatus(status) {
  const el = document.getElementById('paymentStatus');
  if (status === 'paid') {
    el.innerHTML = `
      <h2>✓ Plata a fost confirmată!</h2>
      <p>Îți mulțumim! Comanda ta e plătită și urmează să fie pregătită de livrare.</p>
      <a href="cont.html" class="btn btn-outline">Vezi istoricul comenzilor</a>
    `;
  } else if (status === 'failed') {
    el.innerHTML = `
      <h2>Plata nu a putut fi finalizată</h2>
      <p>Comanda ta este înregistrată, dar plata online nu a fost confirmată. Poți încerca din nou din contul tău, sau te contactăm telefonic.</p>
      <a href="cont.html" class="btn btn-outline">Vezi istoricul comenzilor</a>
    `;
  } else {
    el.innerHTML = `
      <h2>Plata este în curs de confirmare</h2>
      <p>Comanda ta este înregistrată. Confirmarea plății poate dura câteva minute - verifică istoricul comenzilor puțin mai târziu, sau te contactăm telefonic.</p>
      <a href="cont.html" class="btn btn-outline">Vezi istoricul comenzilor</a>
    `;
  }
}

const orderId = getOrderIdFromUrl();
if (!orderId) {
  renderStatus('unknown');
} else {
  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) {
      renderStatus('unknown');
      return;
    }

    const orderRef = firebase.firestore().collection('users').doc(user.uid).collection('orders').doc(orderId);
    let attempts = 0;
    const maxAttempts = 8; // ~16s of polling at 2s apart

    function poll() {
      orderRef.get().then(function (doc) {
        const status = doc.exists ? doc.data().paymentStatus : null;
        if (status === 'paid' || status === 'failed') {
          renderStatus(status);
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
          renderStatus('pending');
          return;
        }
        setTimeout(poll, 2000);
      }).catch(function () {
        renderStatus('unknown');
      });
    }

    poll();
  });
}
