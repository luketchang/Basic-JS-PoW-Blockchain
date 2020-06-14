const Blockchain = require('./Blockchain');
const Block = require('./Block');
const cryptoHash = require('../util/crypto-hash');
const Wallet = require('../wallet/wallet');
const Transaction = require('../wallet/transaction');

describe('Blockchain', () => {
    //declare object we will test
    let blockchain, newChain, originalChain, errorMock;

    //reinstantiate blockchain at start of each test
    beforeEach(() => {
        blockchain = new Blockchain();
        newChain = new Blockchain();
        originalChain = blockchain.chain;

        errorMock = jest.fn()
        global.console.error = errorMock;
    });

    it('contains `chain` as instance of array', () => {
        expect(blockchain.chain instanceof Array).toBe(true);
    });

    it('starts with genesis block', () => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    }); 

    it('adds new block to chain', () => {
        const newData = "new data";
        blockchain.addBlock({data: newData});

        expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData);
    });

    describe('isValidChain()', () => {
        describe('when chain does not start with genesis block', () => {
            it('returns false', () => {
                //alter genesis block
                blockchain.chain[0] = { data: 'false-genesis' };
                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });
        });

        describe('when chain starts with genesis block and contains multiple blocks', () => {

            beforeEach(() => {
                blockchain.addBlock({ data: "Luke"});
                blockchain.addBlock({ data: "Avi"});
                blockchain.addBlock({ data: "Sophie"});
            });

            describe('and a lastHash references has been changed', () => {
                it('returns false', () => {
                    blockchain.chain[2].lastHash = 'broken-lastHash';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false); 
                });
            });

            describe('and chain contains block with invalid field(s)', () => {
                it('returns false', () => {
                    blockchain.chain[2].data = 'tampered-data';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and chain contains block with jumped difficulty', () => {
                it('returns false', () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length - 1];
                    const lastHash = lastBlock.hash;
                    const timestamp = Date.now()
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty - 3;
                    const hash = cryptoHash(timestamp, lastHash, nonce, difficulty, data);

                    const badBlock = new Block({
                        timestamp,lastHash, hash, nonce, difficulty, data
                    });

                    blockchain.chain.push(badBlock);
                    
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain contains no invalid blocks', () => {
                it('returns true', () => {
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });
            });
        });
    });

    describe('replaceChain()', () => {

        // silencing errors and logs in jest
        beforeEach(() => {
            logMock = jest.fn();
            global.console.log = logMock;
        });

        describe('when the chain is shorter', () => {
            beforeEach(() => {
                blockchain.chain[0] = { new: 'chain'}
                blockchain.replaceChain(newChain.chain);
            });

            it('does not replace the chain', () => {
                expect(blockchain.chain).toEqual(originalChain);
            });

            it('logs an error', () => {
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('when the chain is longer', () => {

            //make new chain longer
            beforeEach(() => {
                newChain.addBlock({ data: "Luke"});
                newChain.addBlock({ data: "Avi"});
                newChain.addBlock({ data: "Sophie"});
            });

            describe('and it is invalid', () => {
                beforeEach(() => {
                    newChain.chain[2].hash = 'fake-hash';
                    blockchain.replaceChain(newChain.chain);
                });

                it('does not replace chain', () => {
                    expect(blockchain.chain).toEqual(originalChain);
                });

                it('logs an error', () => {
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and it is valid', () => {
                beforeEach(() => {
                    blockchain.replaceChain(newChain.chain);
                });

                it('replaces the chain', () => {
                    expect(blockchain.chain).toEqual(newChain.chain);
                });

                it('logs chain replacement', () => {
                    expect(logMock).toHaveBeenCalled();
                });
            });
        });

        describe('and the validateTransact flag is ON', () => {
            it('calls validateTransactionData function', () => {
                const validTransactionDataMock = jest.fn();
                blockchain.validateTransactionData = validTransactionDataMock;

                newChain.addBlock({ data: 'foo' });
                blockchain.replaceChain(newChain.chain, true);

                expect(validTransactionDataMock).toHaveBeenCalled();
            });
        });
    });

    describe('validateTransactionData()', () => {
        let transaction, rewardTransaction, wallet;
        beforeEach(() => {
            wallet = new Wallet();
            transaction = wallet.createTransaction({ amount: 65, recipient: 'foo-recipient' });
            rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
        });

        describe('and the transaction data is valid', () => {
            it('returns true', () => {
                newChain.addBlock({ data: [transaction, rewardTransaction] });
                expect(blockchain.validateTransactionData({ chain: newChain.chain })).toBe(true);
                expect(errorMock).not.toHaveBeenCalled();
            });
        });

        describe('and transaction data is invalid', () => {
            describe('and the transaction data has multiple rewards', () => {
                it('returns false and logs an error', () => {
                    newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction] });

                    expect(blockchain.validateTransactionData({ chain: newChain.chain })).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the transaction data has at least one malformed OUTPUT mapping', () => {
                describe('and the transaction is NOT a reward transaction', () => {
                    it('returns false and logs an error', () => {
                        transaction.outputMap[wallet.publicKey] = 99999999;
                        newChain.addBlock({ data: [transaction, rewardTransaction] });

                        expect(blockchain.validateTransactionData({ chain: newChain.chain })).toBe(false);
                        expect(errorMock).toHaveBeenCalled();
                    });
                });

                describe('and the transaction IS a reward transaction', () => {
                    it('returns false and logs an error', () => {
                        rewardTransaction.outputMap[wallet.publicKey] = 99999999;
                        newChain.addBlock({ data: [transaction, rewardTransaction] });

                        expect(blockchain.validateTransactionData({ chain: newChain.chain })).toBe(false);
                        expect(errorMock).toHaveBeenCalled();
                    });
                });
            });

            describe('and the transaction data has at least one malformed INPUT', () => {
                it('returns false and logs an error', () => {
                    wallet.balance = 9000;

                    const badOutputMap = {
                        [wallet.publicKey]: 8900,
                        ['foo-recipient']: 100
                    }

                    const badTransaction = {
                        input: {
                            timestamp: Date.now(),
                            amount: wallet.balance,
                            address: wallet.publicKey,
                            signature: wallet.sign(badOutputMap)
                        },
                        outputMap: badOutputMap
                    }

                    newChain.addBlock({ data: [badTransaction, rewardTransaction] });
                    // initially fails because there is no checks on blockchain history for wallet balances
                    expect(blockchain.validateTransactionData({ chain: newChain.chain })).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            // including duplicate transactions would allow you to pay yourself more than agreed by reusing one valid transaction
            describe('and the block contains duplicate transactions', () => {
                it('returns false and logs an error', () => {
                    newChain.addBlock({ data: [transaction, transaction, transaction] });

                    expect(blockchain.validateTransactionData({ chain: newChain.chain })).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });
    });
});