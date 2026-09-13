// RSA-envelope + AES encrypt/decrypt helpers matching NETOPIA's classic
// (mobilpay-style) payment protocol: the payment request/IPN body is AES
// encrypted, and the AES key itself is RSA-encrypted with our public/private
// keypair (the "Cheie publică"/"Cheie privată" downloaded from the NETOPIA
// merchant dashboard - see startPayment.js/netopiaIpn.js for where those are
// loaded from).
//
// Adapted from NETOPIA's own reference implementation
// (github.com/mobilpay/Node.js, encrypt.js) - same algorithm, just wrapped
// as a small module instead of inlined in the sample.
'use strict';

const crypto = require('crypto');
const forge = require('node-forge');

/**
 * Encrypts `data` (a string, typically the XML payment request body) for
 * sending to NETOPIA: a random AES key encrypts the data, and that AES key
 * is itself RSA-encrypted with NETOPIA's public key (the one paired with
 * our merchant account, downloaded from the dashboard).
 */
function encrypt(publicKeyPem, data, algorithm = 'aes-256-cbc') {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const envKey = crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    key
  );

  return {
    iv: iv.toString('base64'),
    envKey: envKey.toString('base64'),
    envData: encrypted,
    cipher: algorithm,
  };
}

/**
 * Decrypts an incoming NETOPIA payload (IPN notification, or a startPayment
 * response) using our private key to recover the AES key, then AES-decrypts
 * the actual data.
 */
function decrypt(privateKeyPem, ivB64, envKeyB64, dataB64, algorithm) {
  const envKeyBuffer = Buffer.from(envKeyB64, 'base64');

  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const aesKey = Buffer.from(
    privateKey.decrypt(envKeyBuffer.toString('binary'), 'RSAES-PKCS1-V1_5'),
    'binary'
  );

  const decipher = crypto.createDecipheriv(algorithm, aesKey, Buffer.from(ivB64, 'base64'));
  let decrypted = decipher.update(dataB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
