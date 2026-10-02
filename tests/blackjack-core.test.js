const test = require('node:test')
const assert = require('node:assert/strict')

const Core = require('../blackjack-core.js')

test('createShoe builds expected card count for six decks', () => {
  const shoe = Core.createShoe(6)
  assert.equal(shoe.length, 312)

  const acesOfSpades = shoe.filter((card) => card.rank === 'A' && card.suit === '♠').length
  assert.equal(acesOfSpades, 6)
})

test('shuffle keeps the same cards but changes order deterministically with custom rng', () => {
  let calls = 0
  const rng = () => {
    calls += 1
    return 0
  }

  const original = [
    { rank: 'A', suit: '♠' },
    { rank: '2', suit: '♣' },
    { rank: '3', suit: '♥' },
    { rank: '4', suit: '♦' },
  ]

  const shuffled = Core.shuffle(original, rng)

  assert.deepEqual(original, [
    { rank: 'A', suit: '♠' },
    { rank: '2', suit: '♣' },
    { rank: '3', suit: '♥' },
    { rank: '4', suit: '♦' },
  ])

  assert.equal(shuffled.length, original.length)
  assert.equal(calls, original.length - 1)
  assert.notDeepEqual(shuffled, original)

  const serialized = shuffled.map((card) => `${card.rank}${card.suit}`).sort()
  const sourceSerialized = original.map((card) => `${card.rank}${card.suit}`).sort()
  assert.deepEqual(serialized, sourceSerialized)
})

test('drawCard removes one card and returns a copy', () => {
  const shoe = [{ rank: 'K', suit: '♣' }]
  const card = Core.drawCard(shoe)

  assert.deepEqual(card, { rank: 'K', suit: '♣' })
  assert.equal(shoe.length, 0)

  card.rank = 'Q'
  assert.equal(shoe.length, 0)
})

test('createSeededShoe is deterministic for the same seed', () => {
  const seed = '2026-02-18:0'
  const shoeA = Core.createSeededShoe(seed, 1)
  const shoeB = Core.createSeededShoe(seed, 1)

  const topA = shoeA.slice(-10).map((card) => `${card.rank}${card.suit}`)
  const topB = shoeB.slice(-10).map((card) => `${card.rank}${card.suit}`)
  assert.deepEqual(topA, topB)
})

test('createSeededShoe changes ordering with a different seed', () => {
  const shoeA = Core.createSeededShoe('2026-02-18:0', 1)
  const shoeB = Core.createSeededShoe('2026-02-19:0', 1)

  const topA = shoeA.slice(-10).map((card) => `${card.rank}${card.suit}`)
  const topB = shoeB.slice(-10).map((card) => `${card.rank}${card.suit}`)
  assert.notDeepEqual(topA, topB)
})

test('getHandValue handles soft totals correctly', () => {
  const softNineteen = Core.getHandValue([
    { rank: 'A', suit: '♠' },
    { rank: '8', suit: '♣' },
  ])
  assert.equal(softNineteen.total, 19)
  assert.equal(softNineteen.isSoft, true)
  assert.equal(softNineteen.isBlackjack, false)

  const hardTwentyOne = Core.getHandValue([
    { rank: 'A', suit: '♠' },
    { rank: 'A', suit: '♣' },
    { rank: '9', suit: '♥' },
  ])
  assert.equal(hardTwentyOne.total, 21)
  assert.equal(hardTwentyOne.isSoft, true)

  const bust = Core.getHandValue([
    { rank: 'K', suit: '♠' },
    { rank: '9', suit: '♣' },
    { rank: '5', suit: '♥' },
  ])
  assert.equal(bust.isBust, true)
})

test('resolveHandOutcome returns expected result across scenarios', () => {
  const dealerTwenty = [
    { rank: 'K', suit: '♠' },
    { rank: 'Q', suit: '♣' },
  ]

  const natural = Core.resolveHandOutcome(
    [
      { rank: 'A', suit: '♦' },
      { rank: 'K', suit: '♥' },
    ],
    dealerTwenty
  )
  assert.equal(natural, 'blackjack')

  const splitTwentyOne = Core.resolveHandOutcome(
    [
      { rank: 'A', suit: '♦' },
      { rank: 'K', suit: '♥' },
    ],
    dealerTwenty,
    { splitOrigin: true }
  )
  assert.equal(splitTwentyOne, 'win')

  const push = Core.resolveHandOutcome(
    [
      { rank: '10', suit: '♦' },
      { rank: 'Q', suit: '♥' },
    ],
    dealerTwenty
  )
  assert.equal(push, 'push')

  const surrendered = Core.resolveHandOutcome(
    [
      { rank: '10', suit: '♦' },
      { rank: '6', suit: '♥' },
    ],
    dealerTwenty,
    { surrendered: true }
  )
  assert.equal(surrendered, 'surrender')
})

test('resolveHandOutcome gives a dealer natural precedence over any non-natural 21', () => {
  const dealerNatural = [
    { rank: 'A', suit: '♠' },
    { rank: 'K', suit: '♦' },
  ]
  const threeCardTwentyOne = [
    { rank: '7', suit: '♦' },
    { rank: '7', suit: '♥' },
    { rank: '7', suit: '♣' },
  ]
  const splitTwentyOne = [
    { rank: 'A', suit: '♦' },
    { rank: 'K', suit: '♥' },
  ]
  const playerNatural = [
    { rank: 'A', suit: '♥' },
    { rank: 'Q', suit: '♣' },
  ]

  assert.equal(Core.resolveHandOutcome(threeCardTwentyOne, dealerNatural), 'lose')
  assert.equal(
    Core.resolveHandOutcome(splitTwentyOne, dealerNatural, { splitOrigin: true }),
    'lose'
  )
  assert.equal(Core.resolveHandOutcome(playerNatural, dealerNatural), 'push')
})

test('resolveHandOutcome pays a player natural 3:2 even against a dealer 3-card 21', () => {
  const dealerThreeCardTwentyOne = [
    { rank: '7', suit: '♠' },
    { rank: '7', suit: '♦' },
    { rank: '7', suit: '♣' },
  ]
  const playerNatural = [
    { rank: 'A', suit: '♥' },
    { rank: 'K', suit: '♣' },
  ]

  assert.equal(Core.resolveHandOutcome(playerNatural, dealerThreeCardTwentyOne), 'blackjack')
  assert.equal(
    Core.resolveHandOutcome(playerNatural, dealerThreeCardTwentyOne, { splitOrigin: true }),
    'push'
  )
})

test('resolveHandOutcome covers bust, dealer bust, and plain comparisons', () => {
  const bust = [
    { rank: 'K', suit: '♠' },
    { rank: 'Q', suit: '♦' },
    { rank: '5', suit: '♣' },
  ]
  const dealerBust = [
    { rank: 'K', suit: '♠' },
    { rank: '6', suit: '♦' },
    { rank: '9', suit: '♣' },
  ]
  const eighteen = [
    { rank: '10', suit: '♠' },
    { rank: '8', suit: '♦' },
  ]
  const seventeen = [
    { rank: '10', suit: '♥' },
    { rank: '7', suit: '♦' },
  ]

  assert.equal(Core.resolveHandOutcome(bust, dealerBust), 'bust')
  assert.equal(Core.resolveHandOutcome(eighteen, dealerBust), 'win')
  assert.equal(Core.resolveHandOutcome(seventeen, eighteen), 'lose')
  assert.equal(Core.resolveHandOutcome(eighteen, seventeen), 'win')
})

// ---- Round persistence (mid-round refresh must resume, not refund) ----

function sampleRound(overrides = {}) {
  return {
    phase: 'player-turn',
    bet: 100,
    betStack: [100],
    dealerHand: [
      { rank: '6', suit: '♦' },
      { rank: '10', suit: '♣' },
    ],
    hands: [
      {
        bet: 100,
        cards: [
          { rank: '8', suit: '♠' },
          { rank: '8', suit: '♥' },
        ],
        finished: false,
        surrendered: false,
        doubled: false,
        splitOrigin: false,
        splitAces: false,
      },
    ],
    activeHandIndex: 0,
    canInsurance: false,
    insuranceBet: 0,
    hasTakenAction: false,
    chipsBeforeRound: 1000,
    ...overrides,
  }
}

test('sanitizeRoundSnapshot restores a JSON round-tripped in-progress round', () => {
  const restored = Core.sanitizeRoundSnapshot(JSON.parse(JSON.stringify(sampleRound())))
  assert.deepEqual(restored, sampleRound())
})

test('sanitizeRoundSnapshot restores a dealer-turn round with several split hands', () => {
  const base = sampleRound().hands[0]
  const round = sampleRound({
    phase: 'dealer-turn',
    activeHandIndex: 1,
    hands: [
      { ...base, finished: true, splitOrigin: true },
      { ...base, finished: true, splitOrigin: true, doubled: true, bet: 200 },
    ],
  })
  const restored = Core.sanitizeRoundSnapshot(JSON.parse(JSON.stringify(round)))
  assert.equal(restored.phase, 'dealer-turn')
  assert.equal(restored.hands.length, 2)
  assert.equal(restored.hands[1].bet, 200)
})

test('sanitizeRoundSnapshot refuses settled, empty, or corrupted rounds', () => {
  assert.equal(Core.sanitizeRoundSnapshot(null), null)
  assert.equal(Core.sanitizeRoundSnapshot('nope'), null)
  assert.equal(Core.sanitizeRoundSnapshot(sampleRound({ phase: 'round-over' })), null)
  assert.equal(Core.sanitizeRoundSnapshot(sampleRound({ phase: 'betting' })), null)
  assert.equal(Core.sanitizeRoundSnapshot(sampleRound({ hands: [] })), null)
  assert.equal(Core.sanitizeRoundSnapshot(sampleRound({ activeHandIndex: 3 })), null)
  assert.equal(
    Core.sanitizeRoundSnapshot(sampleRound({ dealerHand: [{ rank: 'Z', suit: '♠' }] })),
    null
  )
  assert.equal(Core.sanitizeRoundSnapshot(sampleRound({ bet: -5 })), null)
  assert.equal(Core.sanitizeRoundSnapshot(sampleRound({ chipsBeforeRound: 'lots' })), null)
})

test('encodeShoe and decodeShoe round-trip, and decodeShoe rejects garbage', () => {
  const shoe = Core.createSeededShoe('2026-10-02:0', 6)
  const decoded = Core.decodeShoe(Core.encodeShoe(shoe))
  assert.deepEqual(decoded, shoe)
  assert.equal(Core.decodeShoe('not a shoe'), null)
  assert.equal(Core.decodeShoe(42), null)
  assert.deepEqual(Core.decodeShoe(''), [])
})

// ---- Daily Challenge lock (one attempt per date) ----

test('a started daily attempt cannot be started again the same day', () => {
  let log = {}
  assert.equal(Core.hasDailyAttempt(log, '2026-10-02'), false)

  log = Core.startDailyAttempt(log, '2026-10-02')
  assert.equal(Core.hasDailyAttempt(log, '2026-10-02'), true)
  assert.equal(log['2026-10-02'].status, 'active')

  // Ending it early records the result but does not reopen the day.
  log = Core.finishDailyAttempt(log, '2026-10-02', {
    rounds: 3,
    net: -150,
    bankroll: 850,
    endedBy: 'ended',
  })
  assert.equal(Core.hasDailyAttempt(log, '2026-10-02'), true)
  assert.deepEqual(log['2026-10-02'], {
    status: 'complete',
    rounds: 3,
    net: -150,
    bankroll: 850,
    endedBy: 'ended',
  })

  assert.equal(Core.hasDailyAttempt(log, '2026-10-03'), false)
})

test('daily log is immutable input-wise and keeps only recent days', () => {
  const original = {
    '2026-01-01': { status: 'complete', rounds: 1, net: 0, bankroll: 1000, endedBy: 'limit' },
  }
  const next = Core.startDailyAttempt(original, '2026-10-02')
  assert.equal(Object.keys(original).length, 1)
  assert.equal(Object.keys(next).length, 2)

  let log = {}
  for (let day = 1; day <= 40; day += 1) {
    log = Core.startDailyAttempt(log, `2026-09-${String(day).padStart(2, '0')}`)
  }
  assert.ok(Object.keys(log).length <= Core.DAILY_LOG_DAYS)
  assert.ok(log['2026-09-40'] !== undefined)
})

test('sanitizeDailyLog drops malformed entries', () => {
  const log = Core.sanitizeDailyLog({
    '2026-10-02': { status: 'complete', rounds: 5, net: 20, bankroll: 1020, endedBy: 'limit' },
    'bad-key': { status: 'complete' },
    '2026-10-03': 'nope',
  })
  assert.deepEqual(Object.keys(log), ['2026-10-02'])
  assert.deepEqual(Core.sanitizeDailyLog(null), {})
})

// ---- Table helpers ----

test('describeCard gives screen-reader names', () => {
  assert.equal(Core.describeCard({ rank: 'Q', suit: '♥' }), 'Queen of hearts')
  assert.equal(Core.describeCard({ rank: 'A', suit: '♠' }), 'Ace of spades')
  assert.equal(Core.describeCard({ rank: '10', suit: '♦' }), '10 of diamonds')
  assert.equal(Core.describeCard({ rank: '7', suit: '♣' }), '7 of clubs')
})

test('breakIntoChips uses the fewest chips, largest first', () => {
  assert.deepEqual(Core.breakIntoChips(0), [])
  assert.deepEqual(Core.breakIntoChips(5), [{ value: 5, count: 1 }])
  assert.deepEqual(Core.breakIntoChips(630), [
    { value: 500, count: 1 },
    { value: 100, count: 1 },
    { value: 25, count: 1 },
    { value: 5, count: 1 },
  ])
  assert.deepEqual(Core.breakIntoChips(1000), [{ value: 500, count: 2 }])
})

test('getOutcomeNet matches the table payouts', () => {
  assert.equal(Core.getOutcomeNet(100, 'blackjack'), 150)
  assert.equal(Core.getOutcomeNet(100, 'win'), 100)
  assert.equal(Core.getOutcomeNet(100, 'push'), 0)
  assert.equal(Core.getOutcomeNet(100, 'lose'), -100)
  assert.equal(Core.getOutcomeNet(100, 'bust'), -100)
  assert.equal(Core.getOutcomeNet(100, 'surrender'), -50)
})
