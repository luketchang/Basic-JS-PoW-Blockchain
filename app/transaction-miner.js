const Transaction = require('../wallet/transaction');

/* Class: TransactionMiner
 * ________________________
 * Description:
 *  - contains node's blockchain, local transaction pool, wallet, and pubsub instance
 *  - mineTransaction function has node mine all valid transactions in local pool
 */
class TransactionMiner {
    constructor({ blockchain, transactionPool, wallet, pubsub }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;
        this.pubsub = pubsub;
    }

   /* Function: mineTransactions
    * ___________________________
    * Description: 
    *  - node gets all valid transactions in local pool
    *  - node adds its own reward transaction to validTransactions array
    *  - attempts to create and mine new block with validTransactions
    *  - broadcasts updated blockchain to pubsub then clears local transaction pool
    */
    mineTransactions() {
        const validTransactions = this.transactionPool.getValidTransactions();
        validTransactions.push(
            Transaction.rewardTransaction({ minerWallet: this.wallet })
        );

        this.blockchain.addBlock({ data: validTransactions });

        this.pubsub.broadcastChain();

        this.transactionPool.clear();
    }
}

module.exports = TransactionMiner;