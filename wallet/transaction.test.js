const Transaction = require('./transaction');
const Wallet  = require('./wallet');
const { verifySig } = require('../util/elliptic-curve');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

describe('Transaction', () => {
    let transaction, senderWallet, recipient, amount;

    beforeEach(() => {
        senderWallet = new Wallet();
        recipient = 'recipient-public-key';
        amount = 50;

        transaction = new Transaction({ senderWallet, recipient, amount });
    });

    it('has an id', () => {
        expect(transaction).toHaveProperty('id');
    });

    describe('outputMap', () => {
        it('has an outputMap', () => {
            expect(transaction).toHaveProperty('outputMap');
        });

        it('maps to recipient', () => {
            expect(transaction.outputMap[recipient]).toEqual(amount);
        });

        it('outputs remaining amount to sender wallet', () => {
            expect(transaction.outputMap[senderWallet.publicKey])
                .toEqual(senderWallet.balance - amount);
        });
    });

    describe('input', () => {
        it('has an `input`', () => {
            expect(transaction).toHaveProperty('input');
        });

        it('has a `timestamp` in the `input`', () => {
            expect(transaction.input).toHaveProperty('timestamp');
        });

        it('has `amount` of senderWallet balance', () => {
            expect(transaction.input.amount).toEqual(senderWallet.balance);
        });

        it('has address of senderWallet public key', () => {
            expect(transaction.input.address).toEqual(senderWallet.publicKey);
        });

        it('has valid signature', () => {
            expect(
                verifySig({
                    publicKey: senderWallet.publicKey,
                    data: transaction.outputMap,
                    signature: transaction.input.signature
                })
            ).toBe(true);
        });
    });

    describe('validateTransaction()', () => {

        let errorMock;
        beforeEach(() => {
            errorMock = jest.fn();
            global.console.error = errorMock;
        });

        describe('when transaction is valid', () => {
            it('returns true', () => {
                expect(Transaction.validateTransaction(transaction)).toBe(true);
            });
        });

        describe('when transaction is invalid', () => {
            describe('and outputMap value is invalid', () => {
                it('returns false and logs error', () => {
                    transaction.outputMap[senderWallet.publicKey] = 9999999999;

                    expect(Transaction.validateTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and input signature is invalid', () => {
                it('returns false and logs error', () => {
                    transaction.input.signature = new Wallet().sign('data');
                    expect(Transaction.validateTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });
    });

    // update() function adds new outputs to pre-existing transaction
    describe('update()', () => {
        let originalSig, originalSenderOutput, nextRecipient, nextAmount;

        describe('and the amount is invalid', () => {
            it('throws an error', () => {
                expect(() => transaction.update({ 
                    senderWallet, recipient: 'foo-recipient', amount: 99999999 
                    })
                ).toThrow('amount exceeds balance');
            });
        });

        describe('and the amount is valid', () => {
            beforeEach(() => {
                originalSig = transaction.input.signature;
                originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
                nextRecipient = 'next-recipient';
                nextAmount = 50;

                transaction.update({ senderWallet, recipient: nextRecipient, amount: nextAmount });
            });

            it('outputs the amount to next recipient', () => {
                expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount);
            });

            it('subtracts the amount from the senderWallet balance', () => {
                expect(transaction.outputMap[senderWallet.publicKey]).toEqual(originalSenderOutput - nextAmount);
            });

            it('maintains total output equal to original input', () => {
                const totalOutput = Object.values(transaction.outputMap)
                    .reduce((total, outputAmnt) => total + outputAmnt);
                
                expect(transaction.input.amount).toEqual(totalOutput);
            });

            it('has sender resign transaction', () => {
                expect(transaction.input.signature).not.toEqual(originalSig);
            });

            describe('and there is another update for same recipient', () => {
                let addedAmount;
                beforeEach(() => {
                    addedAmount = 80;
                    transaction.update({ senderWallet, recipient: nextRecipient, amount: addedAmount});
                });

                it('adds to recipient amount', () => {
                    expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount + addedAmount);
                });

                it('subtracts the amount from the original sender output amount', () => {
                    expect(transaction.outputMap[senderWallet.publicKey])
                        .toEqual(originalSenderOutput - nextAmount - addedAmount);
                });
            });
        });
    });

    describe('rewardTransaction()', () => {
        let rewardTransaction, minerWallet;
        beforeEach(() => {
            minerWallet = new Wallet();
            rewardTransaction = Transaction.rewardTransaction({ minerWallet });
        });

        it('creates a transaction with the reward input', () => {
            expect(rewardTransaction.input).toEqual(REWARD_INPUT);
        });

        it('creates one reward transaction with `MINING_REWARD` amount', () => {
            expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(MINING_REWARD);
        });
    });
});