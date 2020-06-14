 const crypto = require('crypto');

   /* Function: cryptoHash
    * ___________________
    * Description:
    *  - creates hash object
    *  - feeds data input into hash object
    *  - returns hash in hex
    */
 const cryptoHash = (...inputs) => {
    const hash = crypto.createHash('sha256');

    hash.update(inputs.map(input => JSON.stringify(input))
      .sort().join(' '));

    return hash.digest('hex');
 };

 module.exports = cryptoHash;