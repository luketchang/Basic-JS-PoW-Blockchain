const Transaction = require('./transaction');

/* Class: TransactionPool
 * ______________________
 * Description: 
 *  - TransactionPool object contains map of transaction ids -> transaction objects
 *  - contains functionality for setting new transactions, returning existing transactions,
 *    and setting/syncing a node's transaction map
 */
class TransactionPool {
    constructor() {
        this.transactionMap = {};
    }

   /* Function: setTransaction
    * ________________________
    * Description: 
    *  - sets key value pair of transaction.id -> transaction
    */
    setTransaction(transaction) {
        this.transactionMap[transaction.id] = transaction;
    }

   /* Function: existingTransaction
    * _____________________________
    * Description: 
    *  - takes in senderAddress, creates array of transactions in pool, and returns result
    *    of search for transaction who's sender matches passed in address
    */
    existingTransaction({ senderAddress }) {
        const transactions = Object.values(this.transactionMap);
        return transactions.find(transaction => transaction.input.address === senderAddress);
    }

   /* Function: setMap
    * _________________
    * Description: 
    *  - used for syncing peer node transaction pools
    *  - sets peer's transaction pool map to passed in map
    */
    setMap(newTransactionMap) {
        this.transactionMap = newTransactionMap;
    }

   /* Function: getValidTransactions
    * _______________________________
    * Description: 
    *  - filters through all transactions in transaction pool map, only returning the valid ones
    */
    getValidTransactions() {
        return Object.values(this.transactionMap).filter(
            transaction => Transaction.validateTransaction(transaction)
        );
    }

   /* Function: clear
    * _________________
    * Description: 
    *  - clears node's local transaction pool map
    */
    clear() {
        this.transactionMap = {};
    }

   /* Function: clearBlockchainTransactions
    * ______________________________________
    * Description: 
    *  - loops through all blocks in blockchain
    *  - loops through all transactions in each block and deletes transactions from local
    *    transaction pool map if transaction already included in block
    */
    clearBlockchainTransactions({ chain }) {
        for(let i = 1; i < chain.length; i++) {
            const block = chain[i];
            for(let transaction of block.data) {
                if(this.transactionMap[transaction.id]) {
                    delete this.transactionMap[transaction.id];
                }
            }
        }
    }
}

module.exports = TransactionPool;