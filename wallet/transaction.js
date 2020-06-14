const { v1: uuidv1 } = require('uuid');
const { verifySig } = require('../util/elliptic-curve');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

/* Class: Transaction
 * __________________
 * Description: 
 *  - contains all information regarding a transaction from a single user
 *  - components: unique id, output map, input information
 *  - validateTransaction: verifies that transaction amounts and signature are valid
 *  - update: adds additional transaction under same user
 *  - note that transactions are created by wallet instance
 */
class Transaction {
    constructor({ senderWallet, recipient, amount, input, outputMap }) {
        this.id = uuidv1();
        this.outputMap = outputMap || this.createOutputMap({ senderWallet, recipient, amount });
        this.input = input || this.createInput({ senderWallet, outputMap: this.outputMap});
    }

   /* Function: createOutputMap
    * _________________________
    * Description: 
    *  - takes in a sender wallet, recipient, and amount 
    *  - creates a map of outputs for transaction (one for sender one for recipient)
    */
    createOutputMap({ senderWallet, recipient, amount }) {
        const outputMap = {};

        outputMap[recipient] = amount;
        outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

        return outputMap;
    }

   /* Function: createInput
    * _____________________
    * Description: 
    *  - takes in a sender wallet and map of outputs
    *  - fills input object with timestamp, total input amount (wallet balance), public
    *    key of sender, and signed transaction
    *  - note that input.amount is wallet balance and outputMap[senderWallet.publicKey] is not same
    */
    createInput({ senderWallet, outputMap }) {
        return {
            timestamp: Date.now(),
            amount: senderWallet.balance,
            address: senderWallet.publicKey,
            signature: senderWallet.sign(outputMap)
        };
    }

   /* Static Function: validateTransaction
    * _____________________________________
    * Description: 
    *  - takes in transaction as input
    *  - checks that total output of transaction equals total input
    *  - checks that signature and output transaction data match
    */
    static validateTransaction(transaction) {
        const { input, outputMap } = transaction;
        const { amount, address, signature } = input;

        const outputTotal = Object.values(outputMap)
            .reduce((total, outputAmnt) => total + outputAmnt);

        if(outputTotal !== amount) {
            console.error(`invalid transaction from ${address}`);
            return false;
        }

        if(!verifySig( { publicKey: address, data: outputMap, signature: signature })) {
            console.error(`invalid signature from ${address}`);
            return false;
        }

        return true;
    }

   /* Function: update
    * _________________
    * Description: 
    *  - checks that additional output doesn't exceed updated output balance
    *  - updates amount pre-existing amount if recipient is same, adds new one otherwise
    *  - updates amount being sent back to sender
    *  - creates updated input object
    */
    update({ senderWallet, recipient, amount }) {
        if(amount > this.outputMap[senderWallet.publicKey]) {
            throw new Error('amount exceeds balance');
        }

        if(!this.outputMap[recipient]) {
            this.outputMap[recipient] = amount;
        } else {
            this.outputMap[recipient] += amount;
        }
        this.outputMap[senderWallet.publicKey] = this.outputMap[senderWallet.publicKey] - amount;
        this.input = this.createInput({ senderWallet, outputMap: this.outputMap });
    }

   /* Function: rewardTransaction
    * ____________________________
    * Description: 
    *  - creates and returns new hard-coded reward transaction for miner
    */
    static rewardTransaction({ minerWallet }) {
        return new this({
            input: REWARD_INPUT,
            outputMap: { [minerWallet.publicKey] : MINING_REWARD}
        });
    }
}

module.exports = Transaction;