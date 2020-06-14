const { STARTING_BALANCE } = require('../config');
const { ec, cryptoHash } = require('../util/elliptic-curve');
const Transaction = require('./transaction');

/* Class: Wallet
 * ______________
 * Description: 
 *  - contains sender's balance and public key
 *  - handles creating and signing transactions
 */
class Wallet {
    constructor() {
        this.balance = STARTING_BALANCE;

        this.keyPair = ec.genKeyPair();
        this.publicKey = this.keyPair.getPublic().encode('hex');
    }

   /* Function: sign
    * _______________
    * Description: 
    *  - takes in the output data of a transaction
    *  - returns signed version of output data (uses elliptic sign function)
    */
    sign(data) {
        return this.keyPair.sign(cryptoHash(data));
    }

   /* Function: createTransaction
    * ____________________________
    * Description: 
    *  - takes in intended amount and recipient sender wants to send to
    *  - sets wallet balance to historically verified balance and checks that output amount <= balance
    *  - returns newly created transaction instance, passing in self (senderWallet), recipient, and amount
    *  - note that if chain is passed in by sender, wallet balance is recalculated before proceding
    */
    createTransaction({ amount, recipient, chain }) {
        if(chain) {
            this.balance = Wallet.calculateBalance({
                chain,
                address: this.publicKey
            });
        }

        if(amount > this.balance) {
            throw new Error('amount exceeds balance');
        }

        return new Transaction({ senderWallet: this, recipient, amount });
    }

   /* Function: calculateBalance
    * ___________________________
    * Description:
    *  - function calculates a wallet's balance using the blockchain history ONLY
    *  - loops through blockchain in reverse order
    *  - if self-directed sender transaction is found, function returns that amount plus
    *    external transactions to sender that came after
    *  - if no self-directed sender transaction found, sum of transactions to sender is returned
    */
    static calculateBalance({ chain, address }) {
        let hasConductedTransaction = false;
        let outputsTotal = 0;

        for(let i = chain.length - 1; i > 0; i--) {
            const block = chain[i];

            for(let transaction of block.data) {
                if(transaction.input.address === address) {
                    hasConductedTransaction = true;
                }

                const outputToWallet = transaction.outputMap[address];
                if(outputToWallet) {
                    outputsTotal = outputsTotal + outputToWallet;
                }
            }
            if(hasConductedTransaction) {
                break;
            }
        }
        
        return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal;
    }
}

module.exports = Wallet;