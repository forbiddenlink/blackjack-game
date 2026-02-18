const test = require('node:test');
const assert = require('node:assert/strict');

const Core = require('../blackjack-core.js');

test('createShoe builds expected card count for six decks', () => {
    const shoe = Core.createShoe(6);
    assert.equal(shoe.length, 312);

    const acesOfSpades = shoe.filter((card) => card.rank === 'A' && card.suit === '♠').length;
    assert.equal(acesOfSpades, 6);
});

test('shuffle keeps the same cards but changes order deterministically with custom rng', () => {
    let calls = 0;
    const rng = () => {
        calls += 1;
        return 0;
    };

    const original = [
        { rank: 'A', suit: '♠' },
        { rank: '2', suit: '♣' },
        { rank: '3', suit: '♥' },
        { rank: '4', suit: '♦' }
    ];

    const shuffled = Core.shuffle(original, rng);

    assert.deepEqual(original, [
        { rank: 'A', suit: '♠' },
        { rank: '2', suit: '♣' },
        { rank: '3', suit: '♥' },
        { rank: '4', suit: '♦' }
    ]);

    assert.equal(shuffled.length, original.length);
    assert.equal(calls, original.length - 1);
    assert.notDeepEqual(shuffled, original);

    const serialized = shuffled.map((card) => `${card.rank}${card.suit}`).sort();
    const sourceSerialized = original.map((card) => `${card.rank}${card.suit}`).sort();
    assert.deepEqual(serialized, sourceSerialized);
});

test('drawCard removes one card and returns a copy', () => {
    const shoe = [{ rank: 'K', suit: '♣' }];
    const card = Core.drawCard(shoe);

    assert.deepEqual(card, { rank: 'K', suit: '♣' });
    assert.equal(shoe.length, 0);

    card.rank = 'Q';
    assert.equal(shoe.length, 0);
});

test('createSeededShoe is deterministic for the same seed', () => {
    const seed = '2026-02-18:0';
    const shoeA = Core.createSeededShoe(seed, 1);
    const shoeB = Core.createSeededShoe(seed, 1);

    const topA = shoeA.slice(-10).map((card) => `${card.rank}${card.suit}`);
    const topB = shoeB.slice(-10).map((card) => `${card.rank}${card.suit}`);
    assert.deepEqual(topA, topB);
});

test('createSeededShoe changes ordering with a different seed', () => {
    const shoeA = Core.createSeededShoe('2026-02-18:0', 1);
    const shoeB = Core.createSeededShoe('2026-02-19:0', 1);

    const topA = shoeA.slice(-10).map((card) => `${card.rank}${card.suit}`);
    const topB = shoeB.slice(-10).map((card) => `${card.rank}${card.suit}`);
    assert.notDeepEqual(topA, topB);
});

test('getHandValue handles soft totals correctly', () => {
    const softNineteen = Core.getHandValue([
        { rank: 'A', suit: '♠' },
        { rank: '8', suit: '♣' }
    ]);
    assert.equal(softNineteen.total, 19);
    assert.equal(softNineteen.isSoft, true);
    assert.equal(softNineteen.isBlackjack, false);

    const hardTwentyOne = Core.getHandValue([
        { rank: 'A', suit: '♠' },
        { rank: 'A', suit: '♣' },
        { rank: '9', suit: '♥' }
    ]);
    assert.equal(hardTwentyOne.total, 21);
    assert.equal(hardTwentyOne.isSoft, true);

    const bust = Core.getHandValue([
        { rank: 'K', suit: '♠' },
        { rank: '9', suit: '♣' },
        { rank: '5', suit: '♥' }
    ]);
    assert.equal(bust.isBust, true);
});

test('resolveHandOutcome returns expected result across scenarios', () => {
    const dealerTwenty = [
        { rank: 'K', suit: '♠' },
        { rank: 'Q', suit: '♣' }
    ];

    const natural = Core.resolveHandOutcome([
        { rank: 'A', suit: '♦' },
        { rank: 'K', suit: '♥' }
    ], dealerTwenty);
    assert.equal(natural, 'blackjack');

    const splitTwentyOne = Core.resolveHandOutcome([
        { rank: 'A', suit: '♦' },
        { rank: 'K', suit: '♥' }
    ], dealerTwenty, { splitOrigin: true });
    assert.equal(splitTwentyOne, 'win');

    const push = Core.resolveHandOutcome([
        { rank: '10', suit: '♦' },
        { rank: 'Q', suit: '♥' }
    ], dealerTwenty);
    assert.equal(push, 'push');

    const surrendered = Core.resolveHandOutcome([
        { rank: '10', suit: '♦' },
        { rank: '6', suit: '♥' }
    ], dealerTwenty, { surrendered: true });
    assert.equal(surrendered, 'surrender');
});
