// NETOPIA credentials, loaded from Firebase Secret Manager - never
// hardcoded and never committed to this repo.
//
// Alex/owner: once the NETOPIA point of sale is approved and you have the
// Semnătură + Cheie privată + Cheie publică from the dashboard, set them
// with (from the functions/ directory, after `npm install -g firebase-tools`
// and `firebase login`):
//
//   firebase functions:secrets:set NETOPIA_SIGNATURE
//   firebase functions:secrets:set NETOPIA_PRIVATE_KEY
//   firebase functions:secrets:set NETOPIA_PUBLIC_KEY
//
// For NETOPIA_PRIVATE_KEY / NETOPIA_PUBLIC_KEY, paste the *entire* contents
// of the downloaded .pem files (including the -----BEGIN/END----- lines)
// when prompted - the CLI accepts multi-line secret values fine.
//
// Also set the base URL this deploys under (used to build the return/IPN
// callback URLs NETOPIA calls back to):
//
//   firebase functions:config:set app.base_url="https://kastelboutique.ro"
//
'use strict';

const { defineSecret } = require('firebase-functions/params');

const NETOPIA_SIGNATURE = defineSecret('NETOPIA_SIGNATURE');
const NETOPIA_PRIVATE_KEY = defineSecret('NETOPIA_PRIVATE_KEY');
const NETOPIA_PUBLIC_KEY = defineSecret('NETOPIA_PUBLIC_KEY');

// Sandbox vs live endpoint. Flip via `firebase functions:config:set
// netopia.env="live"` once real payments are ready to go - defaults to
// sandbox so nothing accidentally charges a real card during development.
const NETOPIA_ENDPOINT = {
  sandbox: 'https://sandboxsecure.mobilpay.ro',
  live: 'https://secure.mobilpay.ro',
};

const BASE_URL = process.env.APP_BASE_URL || 'https://kastelboutique.ro';
const NETOPIA_ENV = process.env.NETOPIA_ENV || 'sandbox';

// Where NETOPIA calls back for the IPN confirmation - this hits the Cloud
// Function directly (Google's own domain), never GitHub Pages, since
// GitHub Pages can't run server code at all. Region/project id come from
// this Firebase project (boutiq-kastel, default us-central1 region) -
// update FUNCTIONS_REGION if the functions are ever deployed elsewhere.
const FUNCTIONS_REGION = process.env.FUNCTIONS_REGION || 'us-central1';
const FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT || 'boutiq-kastel';
const IPN_URL = `https://${FUNCTIONS_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/netopiaIpn`;

module.exports = {
  NETOPIA_SIGNATURE,
  NETOPIA_PRIVATE_KEY,
  NETOPIA_PUBLIC_KEY,
  NETOPIA_ENDPOINT,
  BASE_URL,
  NETOPIA_ENV,
  IPN_URL,
};
