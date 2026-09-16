'use strict';

// Sends the order confirmation email. Triggered server-side the moment a new
// order document is written to Firestore (users/{uid}/orders/{orderId}) -
// this runs on Google's servers, not in the customer's browser, so it fires
// reliably even if they close the tab right after checking out. See cos.js
// for where the order document itself gets created.

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// Must be a sender address on a domain verified in the Resend dashboard.
// Using the shop's own domain once resend.com/domains confirms it; until
// then Resend only allows sending from onboarding@resend.dev for testing.
const FROM_ADDRESS = process.env.ORDER_EMAIL_FROM || 'Boutique Kastel <onboarding@resend.dev>';

function formatPrice(p) {
  return `${Number(p).toFixed(2).replace('.', ',')} Lei`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildEmailHtml(order) {
  const numberLabel = String(order.orderNumber).padStart(4, '0');
  const rows = (order.items || []).map((i) => `
    <tr>
      <td style="padding:8px 0;">${escapeHtml(i.name)}</td>
      <td style="padding:8px 0;text-align:center;">${i.qty}</td>
      <td style="padding:8px 0;text-align:right;">${formatPrice(i.price * i.qty)}</td>
    </tr>
  `).join('');

  const s = order.shipping || {};

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <h2 style="margin-bottom:4px;">Comanda #${numberLabel} este confirmată</h2>
      <p>Îți mulțumim pentru comandă! Am înregistrat-o cu succes și te vom contacta telefonic pentru confirmarea plății.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="border-bottom:1px solid #ddd;text-align:left;">
            <th style="padding:8px 0;">Produs</th>
            <th style="padding:8px 0;text-align:center;">Cant.</th>
            <th style="padding:8px 0;text-align:right;">Preț</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="border-top:1px solid #ddd;font-weight:bold;">
            <td colspan="2" style="padding:8px 0;">Total</td>
            <td style="padding:8px 0;text-align:right;">${formatPrice(order.total)}</td>
          </tr>
        </tfoot>
      </table>
      <h3 style="margin-bottom:4px;">Adresă de livrare</h3>
      <p style="margin-top:0;">
        ${escapeHtml(s.name || '')}<br>
        ${escapeHtml(s.address || '')}, ${escapeHtml(s.city || '')}, ${escapeHtml(s.county || '')}, ${escapeHtml(s.postalCode || '')}<br>
        ${escapeHtml(s.country || '')} &middot; ${escapeHtml(s.phone || '')}
      </p>
      <p style="color:#666;font-size:13px;margin-top:24px;">
        Întrebări legate de comandă? Scrie-ne la boutiquekasteldutyfreeconcept@gmail.com
        sau sună la 0744 377 651.
      </p>
    </div>
  `;
}

exports.sendOrderConfirmationEmail = onDocumentCreated(
  { document: 'users/{uid}/orders/{orderId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const order = event.data && event.data.data();
    if (!order) return;

    const to = order.customerEmail;
    if (!to) {
      logger.warn('Order has no customerEmail, skipping confirmation email', { orderId: event.params.orderId });
      return;
    }

    const numberLabel = String(order.orderNumber).padStart(4, '0');

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [to],
          subject: `Comanda #${numberLabel} - Boutique Kastel`,
          html: buildEmailHtml(order),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        logger.error('Resend API error sending order confirmation', { status: res.status, body, orderId: event.params.orderId });
        return;
      }

      logger.info('Order confirmation email sent', { orderId: event.params.orderId, to });
    } catch (err) {
      // Deliberately not throwing: a failed email must never affect the
      // order itself, which is already safely written to Firestore. Firebase
      // will still retry this function a limited number of times on error if
      // we did throw, but logging is enough here - orders are also visible
      // in the admin panel regardless of email delivery.
      logger.error('Failed to send order confirmation email', { error: String(err), orderId: event.params.orderId });
    }
  }
);
