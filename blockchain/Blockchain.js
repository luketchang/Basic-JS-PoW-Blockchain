const Block = require('./Block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet/wallet')
const cryptoHash = require('../util/crypto-hash');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

class Blockchain {
    constructor() {
        this.chain = [Block.genesis()];
    }

   /* Function: addBlock
    * ___________________
    * Description:
    *  - adds new block using last block's data and new block's data
    */
    addBlock({ data }) {
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length - 1],
            data: data
        });
        
        this.chain.push(newBlock);
    }

   /* Function: replaceChain
    * _______________________
    * Description:
    *  - compares chain length, checks that chain is valid, and if both conditions
    *    are met, chain is replaced
    *  - if callback function onSuccess is passed in, it is called before logging update
    *    and will update node's transaction pool
    */
    replaceChain(chain, validateTransact, onSuccess) {
        if(validateTransact && !this.validateTransactionData({ chain })) {
            console.error('Incoming chain has invalid data');
            return;
        }

        if(chain.length <= this.chain.length) {
            console.error('The incoming chain must be longer.');
            return;
        }

        if(!Blockchain.isValidChain(chain)) {
            console.error('The incoming chain must be valid.');
            return;
        }

        if(onSuccess) onSuccess();

        console.log('replacing chain with', chain);
        this.chain = chain;
    } 

   /* Function: validateTransactionData
    * __________________________________
    * Description:
    *  - function validates all transactions in an incoming broadcasted chain against 
    *    local blockchain, looping through all blocks and looping through all transactions 
    *    of each block
    *  - note that function works under assumption that local blockchain will always be correct
    *    and that invalid chain never becomes adopted in first place
    *  - two cases for given transaction: reward transaction OR normal transaction
    *  - reward transaction:
    *     - checks that there is only 1 reward transaction given block
    *     - checks that mining reward is set constant
    *  - normal transaction:
    *     - checks that transaction has valid amount and signature
    *     - checks that transaction input matches historically correct wallet balance
    *     - checks that valid transaction is not duplicated (since easiest way to cheat system
    *       would be to duplicate valid transactions to pay yourself more)
    */
    validateTransactionData({ chain }) {
        for(let i = 1; i < chain.length; i++) {
            const block = chain[i];
            let transactionSet = new Set();
            let rewardTransactionCount = 0;

            for(let transaction of block.data) {
                if(transaction.input.address === REWARD_INPUT.address) {
                    rewardTransactionCount += 1;

                    if(rewardTransactionCount > 1) {
                        console.error('multiple miner rewards detected');
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
                        console.error('mining reward amount is invalid');
                        return false;
                    }
                } else {
                    if(!Transaction.validateTransaction(transaction)) {
                        console.error('invalid regular transaction');
                        return false;
                    }

                    const realBalance = Wallet.calculateBalance({
                        chain: this.chain,
                        address: transaction.input.address
                    });

                    // checks that balance in local blockchain (before new block was added) 
                    // matches input for new block
                    if(transaction.input.amount !== realBalance) {
                        console.error('invalid input amount');
                        return false;
                    }

                    if(transactionSet.has(transaction)) {
                        console.error('duplicate transaction was detected');
                        return false;
                    } else {
                        transactionSet.add(transaction);
                    }
                }

            }

        }
        return true;
    }
    
   /* Function: isValidChain
    * _______________________
    * Description:
    *  - checks that chain has valid genesis block
    *  - loops through blockchain and checks that each block's lastHash matches the previous
    *    block's hash and that data inside curr block hashes to its own hash
    */
    static isValidChain(chain) {
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
            return false;
        };

        for(let i = 1; i < chain.length; i++) {
            const { timestamp, lastHash, hash, nonce, difficulty, data } = chain[i];
            const actualLastHash = chain[i - 1].hash;
            const lastDifficulty = chain[i - 1].difficulty;
            
            if(lastHash != actualLastHash) {
                return false;
            };
            
            if(hash != cryptoHash(timestamp, lastHash, nonce, difficulty, data)) {
                return false;
            };

            if(Math.abs(lastDifficulty - difficulty) > 1) {
                return false;
            }
        }

        return true;
    }
    
}

module.exports = Blockchain;