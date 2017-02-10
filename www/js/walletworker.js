"use strict";

// import 3rd party libraries - path is relative to the main script (www/js)
importScripts('../lib/bitcore/bundle.js');
importScripts('../lib/crypto-js/pbkdf2.js');
importScripts('../lib/crypto-js/sha256.js');
importScripts('../lib/crypto-js/aes.js');

self.onmessage = function (event) {
    var bitcore = require('bitcore');
    var bip38 = new bitcore.BIP38();
    // The BIP38 standard suggests N = 16384, r = 8, and p = 8
    // For mobile N = 8192 is more appropiate for performance
    bip38.scryptParams = {
        N: 8192,
        r: 8,
        p: 8
    }

    if (event.data.messageType == 'encrypt') {
        var msg = { messageType: 'log', content: "### Start Encryption" };
        postMessage(msg);

        // salt PIN with UUID 
        var saltedPIN = CryptoJS.PBKDF2(event.data.content.secretPIN, event.data.content.deviceUUID, {
            iterations: 10,
            hasher: CryptoJS.algo.SHA256,
            keySize: 256
        });
        var msg = { messageType: 'log', content: "### saltedPIN: " + saltedPIN.toString() };
        postMessage(msg);

        // encrypt privateWIF with saltedPIN
        var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
        var encrypted_password = CryptoJS.AES.encrypt(event.data.content.privateWIF, saltedPIN.toString(), options);
        var msg = { messageType: 'result', content: encrypted_password.toString() };
        postMessage(msg); // return data to main script that invoked the worker
    } else if (event.data.messageType == 'decrypt') {
        var msg = { messageType: 'log', content: "### Start Decryption: " + event.data.content.encryptedPrivateKey + " - PIN: " + event.data.content.secretPIN };
        postMessage(msg);

        // salt PIN with UUID 
        var saltedPIN = CryptoJS.PBKDF2(event.data.content.secretPIN, event.data.content.deviceUUID, {
            iterations: 10,
            hasher: CryptoJS.algo.SHA256,
            keySize: 256
        });
        var msg = { messageType: 'log', content: "### saltedPIN: " + saltedPIN.toString() };
        postMessage(msg);

        // decrypt privateWIF with saltedPIN
        var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
        var decrypted_password = CryptoJS.AES.decrypt(event.data.content.encryptedPrivateKey, saltedPIN.toString(), options);

        var msg = { messageType: 'result', content: decrypted_password.toString(CryptoJS.enc.Utf8) };
        postMessage(msg); // return data to main script that invoked the worker
    } else {
        // not a valid message so ignore
        var msg = { messageType: 'error', content: "Invalid message type: " + event.data.messageType };
        postMessage(msg);
    }
}