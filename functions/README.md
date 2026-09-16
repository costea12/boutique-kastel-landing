# Boutique Kastel — Cloud Functions (NETOPIA payment + order emails)

This is the small piece of server code the static site (GitHub Pages) can't
run on its own: initiating a card payment with NETOPIA (needs our private
key, which must never reach the browser), receiving NETOPIA's payment
confirmation (IPN), and sending the order confirmation email reliably
(from Google's servers, not the customer's browser).

The NETOPIA piece was built ahead of the merchant account being approved,
so it's ready to wire up and test as soon as the point of sale is live.
**Not yet deployed, not yet connected to the site's checkout flow.**

## Files

- `netopia-crypto.js` — RSA-envelope + AES encrypt/decrypt, matching
  NETOPIA's classic (mobilpay-style) protocol. Adapted from NETOPIA's own
  reference implementation (github.com/mobilpay/Node.js).
- `config.js` — loads the NETOPIA signature/keys from Firebase Secret
  Manager (never hardcoded, never committed).
- `startPayment.js` — `startNetopiaPayment`, a callable function the
  checkout page calls once logged in. Looks up the order in Firestore,
  builds the NETOPIA payment XML, encrypts it, returns the encrypted
  payload + the NETOPIA URL for the browser to auto-submit as a form POST.
- `netopiaIpn.js` — `netopiaIpn`, a public HTTPS endpoint NETOPIA calls
  server-to-server once a payment succeeds or fails. Decrypts the
  notification, updates the matching order's `paymentStatus` in Firestore.
  This is the only trustworthy source of "did they actually pay" — never
  the browser return URL alone.
- `orderConfirmationEmail.js` — `sendOrderConfirmationEmail`, a Firestore
  trigger that fires automatically the instant a new order document is
  written under `users/{uid}/orders/{orderId}` (by `cos.js`). Sends the
  confirmation email via Resend. Runs server-side, so it fires even if the
  customer closes the tab right after checkout — unlike EmailJS (used for
  the contact form and return requests), which only runs in the browser.

## One-time setup (once the NETOPIA account is approved)

```bash
npm install -g firebase-tools   # if not already installed
firebase login
cd projects/boutique-kastel
firebase init functions          # point it at this functions/ folder if it asks

# Paste each secret when prompted (private/public key = the FULL .pem file
# contents, including the -----BEGIN/END----- lines):
firebase functions:secrets:set NETOPIA_SIGNATURE
firebase functions:secrets:set NETOPIA_PRIVATE_KEY
firebase functions:secrets:set NETOPIA_PUBLIC_KEY
```

## Order confirmation email setup (Resend)

1. Create a free account at resend.com (3,000 emails/month free).
2. Verify a domain there (e.g. the shop's real domain), or use the default
   `onboarding@resend.dev` sender for testing until that's done.
3. Get the API key from the Resend dashboard, then:

```bash
firebase functions:secrets:set RESEND_API_KEY
```

4. Once a domain is verified, set the real "from" address:

```bash
firebase functions:config:set order_email.from="Boutique Kastel <comenzi@yourdomain.ro>"
```

(or set the `ORDER_EMAIL_FROM` env var directly at deploy time — see
`orderConfirmationEmail.js`.)

5. Deploy (see below). No changes needed on the site/browser side — this
   is a Firestore trigger, not something `cos.js` calls directly.

## Deploy

```bash
cd functions
npm install
firebase deploy --only functions
```

After deploying, note the live URL for `netopiaIpn` (Firebase prints it) —
it should match what `config.js`'s `IPN_URL` computes
(`https://us-central1-boutiq-kastel.cloudfunctions.net/netopiaIpn`); update
`FUNCTIONS_REGION`/`GCLOUD_PROJECT` env vars there if it deployed somewhere
different.

## Still to do before this can go live

1. **Test against NETOPIA's sandbox first** (`NETOPIA_ENV=sandbox`, the
   default) — run a full fake payment end-to-end and confirm the IPN
   actually lands and updates the order correctly, before ever flipping to
   `live`.
2. **Verify the exact IPN acknowledgment XML NETOPIA expects.** The
   `<crc>0</crc>` response in `netopiaIpn.js` is my best read of their
   classic protocol from the reference implementation, but I couldn't
   confirm it against their live docs this session — check it against a
   real sandbox notification before trusting it, otherwise NETOPIA may
   keep retrying the IPN.
3. **Wire the checkout page (`cos.js`) to actually call
   `startNetopiaPayment`** and auto-submit the returned payload to NETOPIA
   — not done yet, since there was nothing live to test against. Small
   addition once the above two are confirmed working: call the function,
   then build and submit a hidden `<form method="post">` with the returned
   `env_key`/`data`/`iv`/`cipher` fields to `action` (the NETOPIA URL it
   also returns).
4. Build `plata-finalizata.html` (the return-URL landing page) — currently
   referenced but doesn't exist yet.
5. Once this all works, ramburs (cash on delivery) stays as the fallback
   payment method for anyone who doesn't want to pay online.
