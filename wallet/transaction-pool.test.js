const TransactionPool = require('./transaction-pool');
const Transaction = require('./transaction');
const Wallet = require('./wallet');
const Blockchain = require('../blockchain/Blockchain');

describe('Transaction Pool', () => {
    let transactionPool, transaction, senderWallet;

    beforeEach(() => {
        senderWallet = new Wallet();
        transactionPool = new TransactionPool();
        transaction = new Transaction({
            senderWallet: senderWallet,
            recipient: 'foo-recipient',
            amount: 50
        });
    });

    describe('setTransaction()', () => {
        it('adds a transaction', () => {
            transactionPool.setTransaction(transaction);
            expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
        });
    });

    describe('existingTransaction()', () => {
        it('returns an existing transaction from transaction pool', () => {
            transactionPool.setTransaction(transaction);
            expect(transactionPool.existingTransaction({ senderAddress: senderWallet.publicKey }))
                .toBe(transaction);
        });
    });

    describe('getValidTransactions()', () => {
        let validTransactions;
        beforeEach(() => {
            errorMock = jest.fn();
            global.console.error = errorMock;
            

            validTransactions = [];
            for(let i = 0; i < 10; i++) {
                transaction = new Transaction({
                    senderWallet,
                    recipient: 'diff-recipient',
                    amount: 40
                });
                
                if(i % 3 === 0) {
                    transaction.input.amount = 9999999;
                } else if (i % 3 === 1) {
                    transaction.input.signature = new Wallet().sign('foo');
                } else {
                    validTransactions.push(transaction);
                }

                transactionPool.setTransaction(transaction);
            }
        });

        it('returns all valid transactions', () => {
            expect(transactionPool.getValidTransactions()).toEqual(validTransactions);
        });

        it('logs errors for invalid transactions', () => {
            transactionPool.getValidTransactions();
            expect(errorMock).toHaveBeenCalled();
        });
    });

    describe('clear()', () => {
        it('clears the transactions', () => {
            transactionPool.clear();
            expect(transactionPool.transactionMap).toEqual({});
        });
    });

    describe('clearBlockchainTransactions()', () => {
        it('clears the pool of any transactions already in blockchain', () => {
            const blockchain = new Blockchain();
            const expectedTransactionMap = {};

            for(let i = 0; i < 6; i++) {
                const transaction = new Wallet().createTransaction({
                    amount: 50,
                    recipient: 'foo-recipient'
                });

                //adds everything to transaction pool so you can clear after
                transactionPool.setTransaction(transaction);

                if(i % 2 === 0) {
                    blockchain.addBlock({ data: [transaction] })
                } else {
                    expectedTransactionMap[transaction.id] = transaction;
                }
            }

            transactionPool.clearBlockchainTransactions({ chain: blockchain.chain });
            expect(transactionPool.transactionMap).toEqual(expectedTransactionMap);
        });
    });
});