// Builds a NETOPIA "start payment" request for one order and hands the
// encrypted payload back to the browser, which auto-submits it as a POST
// form to NETOPIA's own payment page (this is how their classic/mobilpay-
// style protocol works - we never handle card numbers ourselves, NETOPIA's
// hosted page does).
'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const xml2js = require('xml2js');
const netopiaCrypto = require('./netopia-crypto');
const { NETOPIA_SIGNATURE, NETOPIA_PUBLIC_KEY, NETOPIA_ENDPOINT, BASE_URL, NETOPIA_ENV, IPN_URL } = require('./config');

const xmlBuilder = new xml2js.Builder({ cdata: true, headless: true });

// The order id we send NETOPIA is "<uid>__<firestoreOrderId>" so the IPN
// handler (netopiaIpn.js) can find the right users/{uid}/orders/{id} doc
// from NETOPIA's callback alone, without needing our own lookup table.
function toNetopiaOrderId(uid, orderId) {
  return `${uid}__${orderId}`;
}

exports.startNetopiaPayment = onCall(
  { secrets: [NETOPIA_SIGNATURE, NETOPIA_PUBLIC_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Trebuie să fii autentificat.');
    }
    const uid = request.auth.uid;
    const orderId = request.data && request.data.orderId;
    if (!orderId || typeof orderId !== 'string') {
      throw new HttpsError('invalid-argument', 'Lipsește orderId.');
    }

    const db = admin.firestore();
    const orderRef = db.collection('users').doc(uid).collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      throw new HttpsError('not-found', 'Comanda nu a fost găsită.');
    }
    const order = orderSnap.data();

    // Only pay for your own order, and only while it's still unpaid/pending.
    if (order.paymentStatus === 'paid') {
      throw new HttpsError('failed-precondition', 'Comanda este deja plătită.');
    }

    const shipping = order.shipping || {};
    const [firstName, ...lastNameParts] = (order.customerName || shipping.name || 'Client').split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    const netopiaOrderId = toNetopiaOrderId(uid, orderId);
    const timestamp = Date.now();

    const contactBlock = {
      $: { type: 'person' },
      first_name: firstName,
      last_name: lastName,
      address: shipping.address || '',
      email: order.customerEmail || '',
      mobile_phone: shipping.phone || '',
    };

    const orderXmlObj = {
      order: {
        $: { id: netopiaOrderId, timestamp, type: 'card' },
        signature: NETOPIA_SIGNATURE.value(),
        url: {
          return: `${BASE_URL}/plata-finalizata.html?order=${encodeURIComponent(orderId)}`,
          confirm: IPN_URL, // hits the netopiaIpn Cloud Function directly (Google's domain, not GitHub Pages)
        },
        invoice: {
          $: { currency: 'RON', amount: order.total },
          details: `Comandă Boutique Kastel #${order.orderNumber || ''}`,
          contact_info: {
            billing: contactBlock,
            shipping: contactBlock,
          },
        },
        ipn_cipher: 'aes-256-cbc',
      },
    };

    const xml = xmlBuilder.buildObject(orderXmlObj);
    const encrypted = netopiaCrypto.encrypt(NETOPIA_PUBLIC_KEY.value(), xml);

    // Mark the order as "awaiting payment" so we don't double-charge if the
    // customer starts checkout twice; the IPN handler flips this to
    // paid/failed once NETOPIA calls back.
    await orderRef.update({ paymentStatus: 'pending', paymentInitiatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return {
      action: NETOPIA_ENDPOINT[NETOPIA_ENV],
      env_key: encrypted.envKey,
      data: encrypted.envData,
      iv: encrypted.iv,
      cipher: encrypted.cipher,
    };
  }
);

module.exports.toNetopiaOrderId = toNetopiaOrderId;
