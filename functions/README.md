# Boutique Kastel — Cloud Functions (NETOPIA payment)

This is the small piece of server code the static site (GitHub Pages) can't
run on its own: initiating a card payment with NETOPIA (needs our private
key, which must never reach the browser) and receiving NETOPIA's payment
confirmation (IPN).

Built ahead of the NETOPIA merchant account being approved, so it's ready
to wire up and test as soon as the point of sale is live. **Not yet
deployed, not yet connected to the site's checkout flow.**

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
