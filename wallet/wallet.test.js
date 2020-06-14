const Wallet = require('./wallet');
const Transaction = require('./transaction');
const { verifySig } = require('../util/elliptic-curve');
const Blockchain = require('../blockchain/Blockchain');
const { STARTING_BALANCE } = require('../config');

describe('Wallet', () => {
    let wallet;

    beforeEach(() => {
        wallet = new Wallet();
    });

    it('has a balance', () => {
        expect(wallet).toHaveProperty('balance');
    });

    it('has a public key', () => {
        expect(wallet).toHaveProperty('publicKey');
    });

    describe('signing data', () => {
        const data = 'foo-data'
        it('verifies valid signature', () => { 
            expect(
                verifySig({
                    publicKey: wallet.publicKey,
                    data: data,
                    signature: wallet.sign(data)
                })
            ).toBe(true);
        });
    
        it('does not verify invalid signature', () => {
            expect(
                verifySig({
                    publicKey: wallet.publicKey,
                    data: data,
                    signature: new Wallet().sign(data)
                }) 
            ).toBe(false)
        });
    });

    describe('createTransaction()', () => {
        //write more tests, this isn't enough
        describe('and output amount exceeds balance', () => {
            it('throws an error', () => {
                expect(() => wallet.createTransaction({ amount: 9999999, recipient: 'foo-recipient' }))
                    .toThrow('amount exceeds balance');
            });
        });

        describe('and output amount is valid', () => {
            let transaction, amount, recipient;

            beforeEach(() => {
                amount = 50;
                recipient = 'foo-recipient';
                transaction = wallet.createTransaction({ amount, recipient })
            });

            it('and creates an instance of a `Transaction`', () => {
                expect(transaction instanceof Transaction).toBe(true);
            });

            it('and input info matches wallet info', () => {
                expect(transaction.input.address).toEqual(wallet.publicKey);
            });

            it('and output is designated to recipient', () => {
                expect(transaction.outputMap[recipient]).toEqual(amount);
            });
        });

        describe('and chain is passed as parameter', () => {
            it('calls `Wallet.calculateBalance()`', () => {
                const calculateBalanceMock = jest.fn();
                const originalCalculateBalance = Wallet.calculateBalance;

                Wallet.calculateBalance = calculateBalanceMock;

                wallet.createTransaction({
                    amount: 50,
                    recipient: 'foo',
                    chain: new Blockchain().chain
                });

                expect(calculateBalanceMock).toHaveBeenCalled();
                Wallet.calculateBalance = originalCalculateBalance;
            });
        })
    });

    describe('calculateBalance()', () => {
        let blockchain;
        beforeEach(() => {
            blockchain = new Blockchain();
        });

        describe('and there are no outputs FOR/FROM wallet', () => {
            it('returns the `STARTING_BALANCE`', () => {
                expect(
                    Wallet.calculateBalance({ 
                        chain: blockchain.chain, 
                        address: wallet.publicKey 
                    })
                ).toEqual(STARTING_BALANCE);
            });
        });

        describe('and there are outputs FOR/FROM the wallet', () => {
            let transactionOne, transactionTwo;
            beforeEach(() => {
                transactionOne = new Wallet().createTransaction({ 
                    amount: 50,
                    recipient: wallet.publicKey
                 });

                 transactionTwo = new Wallet().createTransaction({
                     amount: 75,
                     recipient: wallet.publicKey
                 });

                 blockchain.addBlock({ data: [transactionOne, transactionTwo] });
            });

            it('adds the sum of all outputs to wallet balance', () => {
                expect(
                    Wallet.calculateBalance({ 
                        chain: blockchain.chain,
                        address: wallet.publicKey
                     })
                ).toEqual(
                    STARTING_BALANCE +
                    transactionOne.outputMap[wallet.publicKey] +
                    transactionTwo.outputMap[wallet.publicKey]
                );
            });

            describe('and the wallet has made a transaction at some point', () => {
                let recentTransaction;
                beforeEach(() => {
                    recentTransaction = wallet.createTransaction({
                        recipient: 'foo',
                        amount: 50
                    });

                    blockchain.addBlock({ data: [recentTransaction] });
                });

                describe('and wallet output transaction was most recent transaction', () => {
                    it('returns the output amount of most recent wallet output transaction', () => {
                        expect(
                            Wallet.calculateBalance({ 
                                chain: blockchain.chain,
                                address: wallet.publicKey
                            })
                        ).toEqual(recentTransaction.outputMap[wallet.publicKey]);
                    });
                });

                describe('and there are transactions after wallet output transaction (same block or following)', () => {
                    let sameBlockTransaction, nextBlockTransaction;
                    beforeEach(() => {
                        recentTransaction = wallet.createTransaction({
                            recipient: 'later-foo',
                            amount: 60
                        });

                        // using mining reward as example where wallet holder also mined his/her own block
                        sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
                        blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction] });

                        nextBlockTransaction = new Wallet().createTransaction({
                            amount: 100,
                            recipient: wallet.publicKey
                        });
                        blockchain.addBlock({ data: [nextBlockTransaction] });
                    });

                    it('includes following output amounts in returned balance', () => {
                        expect(
                            Wallet.calculateBalance({ 
                                chain: blockchain.chain,
                                address: wallet.publicKey
                            })
                        ).toEqual(
                            recentTransaction.outputMap[wallet.publicKey] +
                            sameBlockTransaction.outputMap[wallet.publicKey] +
                            nextBlockTransaction.outputMap[wallet.publicKey]
                        );
                    });
                });
            });
        });
    });
});
