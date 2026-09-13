'use strict';

const admin = require('firebase-admin');
admin.initializeApp();

exports.startNetopiaPayment = require('./startPayment').startNetopiaPayment;
exports.netopiaIpn = require('./netopiaIpn').netopiaIpn;
