// Handles NETOPIA's IPN (Instant Payment Notification) callback - the
// server-to-server POST that confirms whether a card payment actually went
// through. This is the ONLY source of truth for "did the customer pay" -
// never trust the browser return URL alone for that (a customer can close
// the tab, hit back, or the return URL can be hit without payment ever
// completing).
'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const xml2js = require('xml2js');
const netopiaCrypto = require('./netopia-crypto');
const { NETOPIA_PRIVATE_KEY } = require('./config');

const xmlParser = new xml2js.Parser({ explicitArray: false });

function splitNetopiaOrderId(netopiaOrderId) {
  const idx = netopiaOrderId.indexOf('__');
  if (idx === -1) return null;
  return { uid: netopiaOrderId.slice(0, idx), orderId: netopiaOrderId.slice(idx + 2) };
}

// NETOPIA's mobilpay_2_ErrorCode values that mean "money actually
// captured". Everything else (canceled/expired/pending-3ds/declined) is
// left as-is or marked failed - TODO: cross-check this exact list and the
// confirmed XML shape against the sandbox once the merchant account is
// approved and a real test payment can be run end-to-end.
const CONFIRMED_CODES = new Set(['0']);

exports.netopiaIpn = onRequest({ secrets: [NETOPIA_PRIVATE_KEY] }, async (req, res) => {
  try {
    const { env_key: envKey, data, iv, cipher } = req.body || {};
    if (!envKey || !data || !iv || !cipher) {
      res.status(400).send('Missing encrypted payload');
      return;
    }

    const xml = netopiaCrypto.decrypt(NETOPIA_PRIVATE_KEY.value(), iv, envKey, data, cipher);
    const parsed = await xmlParser.parseStringPromise(xml);

    const orderNode = parsed.order || parsed.mobilpay?.order || {};
    const netopiaOrderId = orderNode.$ ? orderNode.$.id : orderNode.id;
    const mobilpayNode = parsed.mobilpay || parsed;
    const errorNode = mobilpayNode.error || {};
    const errorCode = errorNode.$ ? errorNode.$.code : errorNode.code;

    const ids = netopiaOrderId ? splitNetopiaOrderId(netopiaOrderId) : null;
    if (!ids) {
      console.error('netopiaIpn: could not parse order id from', netopiaOrderId);
      res.status(400).send('Bad order id');
      return;
    }

    const db = admin.firestore();
    const orderRef = db.collection('users').doc(ids.uid).collection('orders').doc(ids.orderId);
    const paid = CONFIRMED_CODES.has(String(errorCode));

    await orderRef.update({
      paymentStatus: paid ? 'paid' : 'failed',
      paymentConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentErrorCode: errorCode ?? null,
      // A paid order also moves out of "noua" so it shows up as confirmed
      // in the admin panel without the owner having to manually check it,
      // but never overwrite a status the owner already advanced further
      // (livrata/anulata) - only bump it off the initial "noua".
      ...(paid ? { status: 'confirmata' } : {}),
    });

    // NETOPIA expects a specific XML acknowledgment or it will retry the
    // IPN. TODO: verify this exact response shape against the sandbox -
    // the classic mobilpay protocol expects something like
    // <crc>0</crc>/<crc>error message</crc>; confirm before going live.
    res.set('Content-Type', 'application/xml');
    res.status(200).send('<?xml version="1.0" encoding="utf-8"?><crc>0</crc>');
  } catch (err) {
    console.error('netopiaIpn error:', err);
    res.status(500).send('Internal error');
  }
});
