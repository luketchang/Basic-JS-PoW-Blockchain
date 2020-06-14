const Block = require('./Block');
const { GENESIS_DATA, MINE_RATE } = require('../config');
const cryptoHash = require('../util/crypto-hash');
const hexToBinary = require('hex-to-binary');

describe('Block', () => {
    const timestamp = 2000;
    const lastHash = 'foo-hash';
    const hash = 'hash';
    const data = ['block', 'chain'];
    const nonce = 1;
    const difficulty = 1;
    const block = new Block({ timestamp, lastHash, hash, nonce, difficulty, data });

    // tests
    it("has a timestamp, lasthash, hash, and data", () => {
        expect(block.timestamp).toEqual(timestamp);
        expect(block.lastHash).toEqual(lastHash);
        expect(block.hash).toEqual(hash);
        expect(block.data).toEqual(data);
        expect(block.nonce).toEqual(nonce);
        expect(block.difficulty).toEqual(difficulty);
    });

    describe('genesis()', () => {
        const genesisBlock = Block.genesis();
        console.log(genesisBlock);

        it('returns a Block instance', () => {
            expect(genesisBlock instanceof Block).toBe(true);
        });

        it('returns the genesis data', () => {
            expect(genesisBlock).toEqual(GENESIS_DATA)
        });
    });

    describe('addBlock()', () => {
        const lastBlock = Block.genesis();
        const data = 'mined data';
        const minedBlock = Block.mineBlock({ lastBlock, data });

        it('returns a Block instance', () => {
            expect(minedBlock instanceof Block).toBe(true);
        });

        it('sets `lastHash` equal to `hash` of the last block', () => {
            expect(minedBlock.lastHash).toEqual(lastBlock.hash);
        });

        it('sets the `data`', () => {
            expect(minedBlock.data).toEqual(data);
        });

        it('sets a timestamp', () => {
            expect(minedBlock.timestamp).not.toEqual(undefined);
        });

        it('sets a `hash` that matches `difficulty`', () => {
            expect(hexToBinary(minedBlock.hash).substring(0, minedBlock.difficulty))
                .toEqual('0'.repeat(minedBlock.difficulty))
        });

        it('creates SHA 256 `hash` based on block inputs', () => {
            expect(minedBlock.hash)
                .toEqual(
                    cryptoHash(minedBlock.timestamp, 
                               minedBlock.lastHash,
                               minedBlock.nonce,
                               minedBlock.difficulty, 
                               minedBlock.data,
                               ));
        });

        it('adjusts difficulty', () => {
            const possibleResults = [lastBlock.difficulty + 1, lastBlock.difficulty - 1];
            expect(possibleResults.includes(minedBlock.difficulty)).toBe(true);
        });
    });

    describe('adjustDifficulty()', () => {
        it('raises difficulty of quickly mined block', () => {
            expect(Block.adjustDifficulty({ prevBlock: block, 
                                            currentTimestamp: block.timestamp + MINE_RATE - 100 }))
                                                .toEqual(block.difficulty + 1);
        });

        it('lowers difficulty of slowly mined block', () => {
            expect(Block.adjustDifficulty({ prevBlock: block, 
                currentTimestamp: block.timestamp + MINE_RATE + 100 }))
                    .toEqual(block.difficulty - 1);
        });

        it('will not lower difficulty below 1', () => {
            block.difficulty = - 1;
            expect(Block.adjustDifficulty({ prevBlock: block, 
                currentTimestamp: block.timestamp + MINE_RATE + 100 }))
                    .toEqual(1);
        })
    });
}); 