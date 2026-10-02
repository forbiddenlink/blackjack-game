;(function bootstrapCore(globalScope, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory()
    return
  }

  globalScope.BlackjackCore = factory()
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCore() {
  const BLACKJACK_TOTAL = 21
  const DEALER_STAND_TOTAL = 17
  const SUITS = ['♠', '♥', '♦', '♣']
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

  function getCardNumericValue(rank) {
    if (rank === 'A') return 11
    if (['K', 'Q', 'J'].includes(rank)) return 10
    return Number(rank)
  }

  function getSplitValue(rank) {
    if (rank === 'A') return 11
    if (['10', 'J', 'Q', 'K'].includes(rank)) return 10
    return Number(rank)
  }

  function getHandValue(cards) {
    let total = 0
    let aces = 0

    cards.forEach((card) => {
      if (card.rank === 'A') {
        aces += 1
        total += 1
      } else {
        total += getCardNumericValue(card.rank)
      }
    })

    let softAcesUsed = 0
    while (aces > 0 && total + 10 <= BLACKJACK_TOTAL) {
      total += 10
      aces -= 1
      softAcesUsed += 1
    }

    return {
      total,
      isSoft: softAcesUsed > 0,
      isBust: total > BLACKJACK_TOTAL,
      isBlackjack: cards.length === 2 && total === BLACKJACK_TOTAL,
    }
  }

  function createShoe(decks) {
    const totalDecks = Number.isInteger(decks) && decks > 0 ? decks : 6
    const cards = []

    for (let deck = 0; deck < totalDecks; deck += 1) {
      SUITS.forEach((suit) => {
        RANKS.forEach((rank) => {
          cards.push({ suit, rank })
        })
      })
    }

    return cards
  }

  function hashSeed(seedValue) {
    const seed = String(seedValue ?? '')
    let hash = 2166136261
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
  }

  function createSeededRng(seedValue) {
    let state = hashSeed(seedValue) || 1
    return function seededRandom() {
      state += 0x6d2b79f5
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function shuffle(cards, rng = Math.random) {
    const shuffled = [...cards]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  }

  function drawCard(shoe) {
    if (!Array.isArray(shoe) || shoe.length === 0) {
      return null
    }

    const card = shoe.pop()
    return card ? { ...card } : null
  }

  function createSeededShoe(seedValue, decks = 6) {
    const shoe = createShoe(decks)
    const rng = createSeededRng(seedValue)
    return shuffle(shoe, rng)
  }

  function resolveHandOutcome(playerCards, dealerCards, options = {}) {
    const { splitOrigin = false, surrendered = false } = options
    if (surrendered) {
      return 'surrender'
    }

    const playerValue = getHandValue(playerCards)
    const dealerValue = getHandValue(dealerCards)

    if (playerValue.isBust) return 'bust'

    // A natural is a two-card 21 that did not come from a split. A dealer natural beats any
    // non-natural 21, and a player natural beats a dealer 21 made with three or more cards.
    const playerNatural = playerValue.isBlackjack && !splitOrigin
    const dealerNatural = dealerValue.isBlackjack
    if (dealerNatural) return playerNatural ? 'push' : 'lose'
    if (playerNatural) return 'blackjack'

    if (dealerValue.isBust) return 'win'
    if (dealerValue.total > playerValue.total) return 'lose'
    if (dealerValue.total < playerValue.total) return 'win'

    return 'push'
  }

  // ---- Naming and chips (table presentation helpers) ----

  const RANK_NAMES = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' }
  const SUIT_NAMES = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' }
  const CHIP_VALUES = [500, 100, 25, 5]

  function describeCard(card) {
    return `${RANK_NAMES[card.rank] ?? card.rank} of ${SUIT_NAMES[card.suit] ?? card.suit}`
  }

  function breakIntoChips(amount) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0))
    const chips = []
    CHIP_VALUES.forEach((value) => {
      const count = Math.floor(remaining / value)
      if (count > 0) {
        chips.push({ value, count })
        remaining -= count * value
      }
    })
    return chips
  }

  function getOutcomeNet(bet, outcome) {
    switch (outcome) {
      case 'blackjack':
        return bet * 1.5
      case 'win':
        return bet
      case 'lose':
      case 'bust':
        return -bet
      case 'surrender':
        return -bet / 2
      default:
        return 0
    }
  }

  // ---- Round persistence ----
  // A round saved mid-play is restored on reload so a refresh cannot void or refund a hand.

  const RESUMABLE_PHASES = ['player-turn', 'dealer-turn']
  const MAX_SAVED_HANDS = 4

  function isValidCard(card) {
    return Boolean(card) && RANKS.includes(card.rank) && SUITS.includes(card.suit)
  }

  function isCardList(cards, minimum) {
    return Array.isArray(cards) && cards.length >= minimum && cards.every(isValidCard)
  }

  function sanitizeSavedHand(raw) {
    if (!raw || typeof raw !== 'object') return null
    if (!Number.isFinite(raw.bet) || raw.bet <= 0) return null
    if (!isCardList(raw.cards, 1)) return null

    return {
      bet: raw.bet,
      cards: raw.cards.map((card) => ({ rank: card.rank, suit: card.suit })),
      finished: Boolean(raw.finished),
      surrendered: Boolean(raw.surrendered),
      doubled: Boolean(raw.doubled),
      splitOrigin: Boolean(raw.splitOrigin),
      splitAces: Boolean(raw.splitAces),
    }
  }

  function sanitizeRoundSnapshot(raw) {
    if (!raw || typeof raw !== 'object') return null
    if (!RESUMABLE_PHASES.includes(raw.phase)) return null
    if (!isCardList(raw.dealerHand, 2)) return null
    if (!Number.isFinite(raw.bet) || raw.bet <= 0) return null
    if (!Number.isFinite(raw.chipsBeforeRound)) return null
    if (!Array.isArray(raw.hands) || raw.hands.length === 0) return null
    if (raw.hands.length > MAX_SAVED_HANDS) return null

    const hands = raw.hands.map(sanitizeSavedHand)
    if (hands.some((hand) => hand === null)) return null

    if (!Number.isInteger(raw.activeHandIndex)) return null
    if (raw.activeHandIndex < 0 || raw.activeHandIndex >= hands.length) return null

    const insuranceBet =
      Number.isFinite(raw.insuranceBet) && raw.insuranceBet > 0 ? raw.insuranceBet : 0

    return {
      phase: raw.phase,
      bet: raw.bet,
      betStack: Array.isArray(raw.betStack)
        ? raw.betStack.filter((amount) => Number.isFinite(amount) && amount > 0)
        : [],
      dealerHand: raw.dealerHand.map((card) => ({ rank: card.rank, suit: card.suit })),
      hands,
      activeHandIndex: raw.activeHandIndex,
      canInsurance: Boolean(raw.canInsurance),
      insuranceBet,
      hasTakenAction: Boolean(raw.hasTakenAction),
      chipsBeforeRound: raw.chipsBeforeRound,
    }
  }

  function encodeShoe(cards) {
    return cards.map((card) => `${card.rank}${card.suit}`).join(',')
  }

  function decodeShoe(encoded) {
    if (typeof encoded !== 'string') return null
    if (encoded === '') return []

    const cards = encoded.split(',').map((token) => {
      const suit = token.slice(-1)
      const rank = token.slice(0, -1)
      return { rank, suit }
    })

    return cards.every(isValidCard) ? cards : null
  }

  // ---- Daily Challenge: one attempt per local date ----

  const DAILY_ROUND_LIMIT = 20
  const DAILY_LOG_DAYS = 30
  const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

  function pruneDailyLog(log) {
    const keys = Object.keys(log).sort()
    const kept = keys.slice(Math.max(0, keys.length - DAILY_LOG_DAYS))
    return Object.fromEntries(kept.map((key) => [key, log[key]]))
  }

  function hasDailyAttempt(log, dateKey) {
    return Boolean(log) && Object.hasOwn(log, dateKey)
  }

  function startDailyAttempt(log, dateKey) {
    return pruneDailyLog({ ...log, [dateKey]: { status: 'active' } })
  }

  function finishDailyAttempt(log, dateKey, result) {
    const { rounds, net, bankroll, endedBy } = result
    return pruneDailyLog({
      ...log,
      [dateKey]: { status: 'complete', rounds, net, bankroll, endedBy },
    })
  }

  function sanitizeDailyLog(raw) {
    if (!raw || typeof raw !== 'object') return {}

    const clean = {}
    Object.entries(raw).forEach(([key, entry]) => {
      if (!DATE_KEY_PATTERN.test(key) || !entry || typeof entry !== 'object') return
      if (entry.status === 'active') {
        clean[key] = { status: 'active' }
        return
      }
      if (
        entry.status === 'complete' &&
        Number.isFinite(entry.rounds) &&
        Number.isFinite(entry.net)
      ) {
        clean[key] = {
          status: 'complete',
          rounds: entry.rounds,
          net: entry.net,
          bankroll: Number.isFinite(entry.bankroll) ? entry.bankroll : 0,
          endedBy: String(entry.endedBy ?? 'ended'),
        }
      }
    })
    return pruneDailyLog(clean)
  }

  return {
    BLACKJACK_TOTAL,
    DEALER_STAND_TOTAL,
    SUITS,
    RANKS,
    getCardNumericValue,
    getSplitValue,
    getHandValue,
    createShoe,
    createSeededRng,
    createSeededShoe,
    shuffle,
    drawCard,
    resolveHandOutcome,
    describeCard,
    breakIntoChips,
    getOutcomeNet,
    sanitizeRoundSnapshot,
    encodeShoe,
    decodeShoe,
    DAILY_ROUND_LIMIT,
    DAILY_LOG_DAYS,
    hasDailyAttempt,
    startDailyAttempt,
    finishDailyAttempt,
    sanitizeDailyLog,
  }
})
