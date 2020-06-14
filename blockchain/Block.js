const { GENESIS_DATA, MINE_RATE } = require('../config');
const cryptoHash = require('../util/crypto-hash');
const hexToBinary = require('hex-to-binary');

class Block {
    constructor({ timestamp, lastHash, hash, data, nonce, difficulty }) {
        this.timestamp = timestamp;
        this.lastHash = lastHash;
        this.hash = hash;
        this.nonce = nonce;
        this.difficulty = difficulty;
        this.data = data;
    }

    /* Function: genesis
    * __________________
    * Description: 
    *    - creates genesis block
    */
    static genesis() {
        return new this(GENESIS_DATA);
    }

    /* Function: mineBlock
    * __________________
    * Description: 
    *    - gets data of current block and difficulty + hash of last block
    *    - loops and increments nonce until correct number of leading zeros are filled
    *    - return newly mined block
    */
    static mineBlock({ lastBlock, data }) {
        let timestamp, hash;
        const lastHash = lastBlock.hash;
        let { difficulty } = lastBlock;
        let nonce = 0;

        do {
            nonce++;
            timestamp = Date.now();
            difficulty = Block.adjustDifficulty({ prevBlock: lastBlock, currentTimestamp: timestamp });
            hash = cryptoHash(timestamp, lastHash, nonce, difficulty, data);
        } while (hexToBinary(hash).substring(0, difficulty) !== '0'.repeat(difficulty));

        return new this({
            timestamp: timestamp,
            lastHash: lastHash,
            hash: hash,
            difficulty: difficulty,
            nonce: nonce,
            data: data
        });
    }
    
    /* Function: adjustDifficulty
    * __________________
    * Description:
    *    - gets difficulty of previous block
    *    - checks whether difference in prev and curr timestamps > mine rate
    *    - if so difficulty is lowered and if not difficulty is raised (equilibrium)
    */
    static adjustDifficulty({ prevBlock, currentTimestamp }) {
        const { difficulty } = prevBlock;
        if(difficulty < 1) return 1;
        const difference = currentTimestamp - prevBlock.timestamp;
        return (difference > MINE_RATE ) ? difficulty - 1 : difficulty + 1;
    }
}

module.exports = Block;