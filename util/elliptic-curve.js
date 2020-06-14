const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const cryptoHash = require('../util/crypto-hash');

//data = output
const verifySig = ({ publicKey, data, signature }) => {
    const pubKey = ec.keyFromPublic(publicKey, 'hex');
    return pubKey.verify(cryptoHash(data), signature);  //boolean
};

module.exports = { ec, verifySig, cryptoHash };