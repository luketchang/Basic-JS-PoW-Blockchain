const cryptoHash = require('./crypto-hash');

describe('cryptoHash()', () => {

    it('generates SHA 256 hashed output', () => {
        expect(cryptoHash('foo'))
            .toEqual('b2213295d564916f89a6a42455567c87c3f480fcd7a1c15e220f17d7169a790b');
    });

    it('produces same hash output for same arguments in different order', () => {
        expect(cryptoHash('one', 'two', 'three'))
            .toEqual(cryptoHash('three', 'two', 'one'));
    });

    it('produces unique hash when variable properties have changed', () => {
        const foo = {};
        const originalHash = cryptoHash(foo);
        foo['a'] = 'a';

        expect(cryptoHash(foo)).not.toEqual(originalHash);
    });
});