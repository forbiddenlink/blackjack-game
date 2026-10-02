const STORAGE_KEY = 'blackjackStudioState.v2'
const SHOE_DECKS = 6
const MAX_SPLIT_HANDS = 4
const SHOE_SIZE = SHOE_DECKS * 52
const RESHUFFLE_THRESHOLD = 52
const DAILY_ROUND_LIMIT = window.BlackjackCore?.DAILY_ROUND_LIMIT ?? 20
const Core = window.BlackjackCore
if (!Core) {
  throw new Error('BlackjackCore is missing. Ensure blackjack-core.js loads before index.js.')
}

const BLACKJACK_TOTAL = Core.BLACKJACK_TOTAL
const DEALER_STAND_TOTAL = Core.DEALER_STAND_TOTAL

const ACHIEVEMENTS = [
  {
    id: 'first_win',
    name: 'First Victory',
    icon: '🎉',
    desc: 'Win your first hand',
    check: (_, s) => s.wins >= 1,
  },
  {
    id: 'blackjack',
    name: 'Natural 21',
    icon: '🃏',
    desc: 'Hit a natural blackjack',
    check: (_, s) => s.blackjacks >= 1,
  },
  {
    id: 'hot_streak',
    name: 'Hot Streak',
    icon: '🔥',
    desc: 'Win 3 hands in a row',
    check: (_, s) => s.currentStreak >= 3,
  },
  {
    id: 'on_fire',
    name: 'On Fire',
    icon: '💥',
    desc: 'Win 5 hands in a row',
    check: (_, s) => s.bestStreak >= 5,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    icon: '🎖️',
    desc: 'Play 50 hands',
    check: (_, s) => s.totalHands >= 50,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    icon: '🏆',
    desc: 'Play 100 hands',
    check: (_, s) => s.totalHands >= 100,
  },
  {
    id: 'double_win',
    name: 'Double Threat',
    icon: '⚡',
    desc: 'Win after doubling down',
    check: (_, s) => s.doubleDownWins >= 1,
  },
  {
    id: 'split_master',
    name: 'Split Decision',
    icon: '✂️',
    desc: 'Win with a split hand',
    check: (_, s) => s.splitWins >= 1,
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    icon: '💰',
    desc: 'Reach $5000 bankroll',
    check: (p) => p.chips >= 5000,
  },
  {
    id: 'profitable',
    name: 'In The Green',
    icon: '📈',
    desc: 'Earn $1000 net profit',
    check: (_, s) => s.totalWon - s.totalLost >= 1000,
  },
]

function createDefaultStats() {
  return {
    totalHands: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    blackjacks: 0,
    busts: 0,
    totalWagered: 0,
    totalWon: 0,
    totalLost: 0,
    currentStreak: 0,
    bestStreak: 0,
    doubleDownWins: 0,
    splitWins: 0,
    insuranceWins: 0,
  }
}

function createEmptyRound() {
  return {
    phase: 'betting',
    bet: 0,
    betStack: [],
    dealerHand: [],
    hands: [],
    activeHandIndex: 0,
    canInsurance: false,
    insuranceBet: 0,
    hasTakenAction: false,
    chipsBeforeRound: null,
    settled: false,
  }
}

function createHand({ bet, cards, splitOrigin = false, splitAces = false }) {
  return {
    bet,
    cards: [...cards],
    finished: false,
    surrendered: false,
    doubled: false,
    splitOrigin,
    splitAces,
  }
}

function getCurrentLocalDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createDefaultChallenge() {
  return {
    active: false,
    seedDate: getCurrentLocalDateKey(),
    roundsPlayed: 0,
    startingChips: 0,
    reshuffles: 0,
    drawn: 0,
  }
}

let player = {
  name: 'Player',
  chips: 1000,
  achievements: [],
  settings: {
    sound: true,
    hints: true,
  },
}

let stats = createDefaultStats()
let history = []
let shoe = []
let round = createEmptyRound()
let challenge = createDefaultChallenge()
let dailyLog = {}
let savedRound = null
let savedShoe = null
let suppressDealAnimation = false
let resumeNotice = ''
let resetTimer = null
let audioContext = null

const elements = {}

document.addEventListener('DOMContentLoaded', () => {
  cacheElements()
  loadGame()
  syncChallengeWithToday()
  restoreShoe()
  bindEvents()
  const resumed = resumeSavedRound()
  suppressDealAnimation = true
  renderAll()
  suppressDealAnimation = false

  if (resumed === 'dealer-turn') {
    setMessage('Round resumed after reload. Dealer is playing...')
    startDealerTurn()
  } else if (resumed === 'player-turn') {
    setMessage('Round resumed after reload. Your move.')
  } else if (!resumeNotice) {
    setMessage('Welcome to Blackjack Studio. Place your bet to begin.')
  } else {
    setMessage(resumeNotice)
  }
})

function cacheElements() {
  const ids = [
    'player-form',
    'player-name-input',
    'set-name-btn',
    'player-el',
    'message-el',
    'dealer-phase',
    'dealer-cards',
    'dealer-sum-el',
    'player-hands',
    'hint-el',
    'bet-stack',
    'felt',
    'shoe-el',
    'shoe-count',
    'shoe-meter-fill',
    'active-hand-indicator',
    'current-bet',
    'undo-bet-btn',
    'clear-bet-btn',
    'start-btn',
    'hit-btn',
    'stand-btn',
    'double-btn',
    'split-btn',
    'insurance-btn',
    'surrender-btn',
    'sound-toggle',
    'hints-toggle',
    'challenge-panel',
    'challenge-seed',
    'challenge-status',
    'challenge-rounds',
    'challenge-net',
    'challenge-toggle-btn',
    'challenge-share-btn',
    'history-container',
    'clear-history-btn',
    'achievements-grid',
    'stat-total-hands',
    'stat-win-rate',
    'stat-total-won',
    'stat-best-streak',
    'stat-wins',
    'stat-losses',
    'stat-pushes',
    'stat-blackjacks',
    'stat-busts',
    'stat-current-streak',
    'stat-double-wins',
    'stat-split-wins',
    'stat-total-wagered',
    'stat-net-profit',
  ]

  ids.forEach((id) => {
    elements[id] = document.getElementById(id)
  })
}

function bindEvents() {
  elements['player-form'].addEventListener('submit', (event) => {
    event.preventDefault()
    setPlayerName()
  })

  document.querySelectorAll('.chip-button').forEach((button) => {
    button.addEventListener('click', () => {
      const value = Number(button.dataset.value)
      addBet(value, button)
    })
  })

  elements['undo-bet-btn'].addEventListener('click', undoBet)
  elements['clear-bet-btn'].addEventListener('click', clearBet)
  elements['start-btn'].addEventListener('click', startRound)
  elements['hit-btn'].addEventListener('click', hit)
  elements['stand-btn'].addEventListener('click', stand)
  elements['double-btn'].addEventListener('click', doubleDown)
  elements['split-btn'].addEventListener('click', split)
  elements['insurance-btn'].addEventListener('click', takeInsurance)
  elements['surrender-btn'].addEventListener('click', surrender)
  elements['challenge-toggle-btn'].addEventListener('click', toggleDailyChallenge)
  elements['challenge-share-btn'].addEventListener('click', shareDailyChallengeResult)

  elements['sound-toggle'].addEventListener('change', (event) => {
    player.settings.sound = event.target.checked
    saveGame()
  })

  elements['hints-toggle'].addEventListener('change', (event) => {
    player.settings.hints = event.target.checked
    updateHint()
    saveGame()
  })

  elements['clear-history-btn'].addEventListener('click', () => {
    if (!history.length) {
      return
    }

    if (window.confirm('Clear saved hand history?')) {
      history = []
      renderHistory()
      saveGame()
    }
  })

  document.addEventListener('keydown', handleKeyboardShortcuts)
  document.addEventListener('pointerdown', ensureAudioContext, { once: true })
}

function handleKeyboardShortcuts(event) {
  const target = event.target
  if (target instanceof HTMLElement) {
    const tag = target.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea') {
      return
    }
  }

  const key = event.key.toLowerCase()
  if (key === 'h' && !elements['hit-btn'].disabled) hit()
  if (key === 's' && !elements['stand-btn'].disabled) stand()
  if (key === 'd' && !elements['double-btn'].disabled) doubleDown()
  if (key === 'p' && !elements['split-btn'].disabled) split()
  if (key === 'i' && !elements['insurance-btn'].disabled) takeInsurance()
  if (key === 'r' && !elements['start-btn'].disabled) startRound()
  if (key === 'c') toggleDailyChallenge()
}

function setPlayerName() {
  const value = elements['player-name-input'].value.trim()
  if (!value) {
    setMessage('Enter a name before saving.')
    return
  }

  player.name = value
  elements['player-name-input'].value = ''
  setMessage(`Welcome, ${player.name}. Good luck at the table.`)
  renderPlayer()
  saveGame()
}

function toggleDailyChallenge() {
  if (round.phase !== 'betting') {
    setMessage('Daily Challenge can only be toggled between rounds.')
    return
  }

  const today = getCurrentLocalDateKey()

  if (!challenge.active) {
    if (Core.hasDailyAttempt(dailyLog, today)) {
      setMessage("You already played today's Daily Challenge. A new shoe opens tomorrow.")
      return
    }

    const confirmed = window.confirm(
      `Start today's Daily Challenge? You get one attempt per day: ${DAILY_ROUND_LIMIT} rounds, and ending early still uses the day.`
    )
    if (!confirmed) {
      return
    }

    dailyLog = Core.startDailyAttempt(dailyLog, today)
    challenge = {
      active: true,
      seedDate: today,
      roundsPlayed: 0,
      startingChips: player.chips,
      reshuffles: 0,
      drawn: 0,
    }
    buildShoe(true)
    setMessage(`Daily Challenge started: ${DAILY_ROUND_LIMIT} rounds on today's shoe.`)
  } else {
    const confirmed = window.confirm(
      "End today's Daily Challenge? Your result is recorded and you cannot restart it until tomorrow."
    )
    if (!confirmed) {
      return
    }

    completeDailyChallenge('ended')
    setMessage('Daily Challenge ended. Your result is saved for today.')
  }

  renderAll()
  saveGame()
}

function completeDailyChallenge(endedBy) {
  dailyLog = Core.finishDailyAttempt(dailyLog, challenge.seedDate, {
    rounds: challenge.roundsPlayed,
    net: player.chips - challenge.startingChips,
    bankroll: player.chips,
    endedBy,
  })
  challenge = createDefaultChallenge()
  buildShoe(true)
}

function getDailyResultSummary() {
  const today = getCurrentLocalDateKey()
  const record = dailyLog[today]
  if (challenge.active) {
    return {
      date: challenge.seedDate,
      rounds: challenge.roundsPlayed,
      net: player.chips - challenge.startingChips,
      bankroll: player.chips,
      live: true,
    }
  }
  if (record?.status === 'complete') {
    return { date: today, ...record, live: false }
  }
  return null
}

async function shareDailyChallengeResult() {
  const result = getDailyResultSummary()
  if (!result || result.rounds === 0) {
    setMessage('Play at least one Daily Challenge round to share a score.')
    return
  }

  const summary = `Blackjack Studio Daily Challenge ${result.date}: ${result.rounds} rounds, bankroll ${formatCurrency(result.bankroll)}, net ${result.net >= 0 ? '+' : ''}${formatCurrency(result.net)}.`

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary)
      setMessage('Daily Challenge score copied to clipboard.')
    } else {
      window.prompt('Copy your Daily Challenge result:', summary)
    }
  } catch (_) {
    window.prompt('Copy your Daily Challenge result:', summary)
  }
}

function syncChallengeWithToday() {
  const today = getCurrentLocalDateKey()
  if (challenge.active && challenge.seedDate !== today) {
    // An attempt left open past midnight is closed out on its own date, never reopened.
    completeDailyChallenge('expired')
  }

  if (
    challenge.active &&
    (!Number.isFinite(challenge.startingChips) || challenge.startingChips <= 0)
  ) {
    challenge.startingChips = player.chips
  }
}

function addBet(amount, button) {
  if (round.phase !== 'betting') {
    setMessage('Finish the active hand before changing bets.')
    return
  }

  if (round.bet + amount > player.chips) {
    setMessage('You do not have enough bankroll for that bet.')
    return
  }

  round.bet += amount
  round.betStack.push(amount)

  if (button) {
    button.classList.add('bet')
    setTimeout(() => button.classList.remove('bet'), 250)
  }

  playSound('chip')
  setMessage(`Current bet: ${formatCurrency(round.bet)}.`)
  renderBetting()
  renderButtons()
}

function undoBet() {
  if (round.phase !== 'betting') {
    return
  }

  const amount = round.betStack.pop()
  if (!amount) {
    return
  }

  round.bet -= amount
  setMessage(`Removed ${formatCurrency(amount)} from the bet.`)
  renderBetting()
  renderButtons()
}

function clearBet() {
  if (round.phase !== 'betting') {
    return
  }

  round.bet = 0
  round.betStack = []
  setMessage('Bet cleared.')
  renderBetting()
  renderButtons()
}

function startRound() {
  if (round.phase !== 'betting') {
    return
  }

  if (round.bet <= 0) {
    setMessage('Place a bet first.')
    return
  }

  if (round.bet > player.chips) {
    setMessage('Bet exceeds bankroll.')
    return
  }

  clearResetTimer()

  // Reshuffle between rounds at the cut card, never while cards are on the table.
  const reshuffled = shoe.length < RESHUFFLE_THRESHOLD
  if (reshuffled) {
    buildShoe(true)
  }

  round.chipsBeforeRound = player.chips
  player.chips -= round.bet
  stats.totalWagered += round.bet

  round.hands = [createHand({ bet: round.bet, cards: [drawCard(), drawCard()] })]
  round.dealerHand = [drawCard(), drawCard()]
  round.activeHandIndex = 0
  round.phase = 'player-turn'
  round.settled = false
  round.canInsurance = round.dealerHand[0].rank === 'A'
  round.insuranceBet = 0
  round.hasTakenAction = false

  playSound('deal')

  const playerValue = getHandValue(round.hands[0].cards)
  const dealerValue = getHandValue(round.dealerHand)
  const dealerUpValue = getCardNumericValue(round.dealerHand[0].rank)

  if (playerValue.isBlackjack && dealerValue.isBlackjack) {
    finalizeRound([{ hand: round.hands[0], outcome: 'push' }], 'Both sides have blackjack. Push.')
    return
  }

  if (playerValue.isBlackjack) {
    finalizeRound(
      [{ hand: round.hands[0], outcome: 'blackjack' }],
      'Natural blackjack. You win 3:2.'
    )
    return
  }

  if (dealerUpValue === 10 && dealerValue.isBlackjack) {
    finalizeRound([{ hand: round.hands[0], outcome: 'lose' }], 'Dealer has blackjack.')
    return
  }

  const prefix = reshuffled
    ? challenge.active
      ? 'Challenge shoe reshuffled. '
      : 'Shoe reshuffled. '
    : ''
  if (round.canInsurance) {
    setMessage(`${prefix}Dealer shows an Ace. Insurance is available.`)
  } else {
    setMessage(`${prefix}Hit, stand, split, or double down.`)
  }

  renderAll()
  saveGame()
}

function hit() {
  if (round.phase !== 'player-turn') {
    return
  }

  if (resolveDealerPeekBeforeAction()) {
    return
  }

  const hand = getActiveHand()
  if (!hand || hand.finished) {
    return
  }

  if (hand.splitAces) {
    setMessage('Split aces receive one card only. Stand to continue.')
    return
  }

  hand.cards.push(drawCard())
  round.hasTakenAction = true
  round.canInsurance = false
  playSound('deal')

  const value = getHandValue(hand.cards)
  if (value.isBust) {
    hand.finished = true
    setMessage(`Hand ${round.activeHandIndex + 1} busts at ${value.total}.`)
    moveToNextHandOrDealer()
  } else if (value.total === BLACKJACK_TOTAL) {
    hand.finished = true
    setMessage(`Hand ${round.activeHandIndex + 1} reaches 21.`)
    moveToNextHandOrDealer()
  }

  renderAll()
  saveGame()
}

function stand() {
  if (round.phase !== 'player-turn') {
    return
  }

  if (resolveDealerPeekBeforeAction()) {
    return
  }

  const hand = getActiveHand()
  if (!hand) {
    return
  }

  hand.finished = true
  round.hasTakenAction = true
  round.canInsurance = false
  setMessage(`Standing on hand ${round.activeHandIndex + 1}.`)
  moveToNextHandOrDealer()
  renderAll()
  saveGame()
}

function doubleDown() {
  if (round.phase !== 'player-turn') {
    return
  }

  if (resolveDealerPeekBeforeAction()) {
    return
  }

  const hand = getActiveHand()
  if (!hand || !canDouble(hand)) {
    return
  }

  player.chips -= hand.bet
  stats.totalWagered += hand.bet
  hand.bet *= 2
  hand.doubled = true
  hand.cards.push(drawCard())
  hand.finished = true
  round.hasTakenAction = true
  round.canInsurance = false

  playSound('chip')
  setMessage(`Doubled down on hand ${round.activeHandIndex + 1}.`)
  moveToNextHandOrDealer()
  renderAll()
  saveGame()
}

function split() {
  if (round.phase !== 'player-turn') {
    return
  }

  if (resolveDealerPeekBeforeAction()) {
    return
  }

  const hand = getActiveHand()
  if (!hand || !canSplit(hand) || round.hands.length >= MAX_SPLIT_HANDS) {
    return
  }

  if (player.chips < hand.bet) {
    setMessage('Not enough bankroll to split this hand.')
    return
  }

  player.chips -= hand.bet
  stats.totalWagered += hand.bet

  const splitAces = hand.cards[0].rank === 'A' && hand.cards[1].rank === 'A'
  const first = createHand({
    bet: hand.bet,
    cards: [hand.cards[0], drawCard()],
    splitOrigin: true,
    splitAces,
  })
  const second = createHand({
    bet: hand.bet,
    cards: [hand.cards[1], drawCard()],
    splitOrigin: true,
    splitAces,
  })

  if (splitAces) {
    first.finished = true
    second.finished = true
  }

  round.hands.splice(round.activeHandIndex, 1, first, second)
  round.hasTakenAction = true
  round.canInsurance = false

  playSound('chip')

  if (splitAces) {
    setMessage('Split aces dealt one card each. Dealer turn next.')
    moveToNextHandOrDealer()
  } else {
    setMessage(`Split complete. Playing hand ${round.activeHandIndex + 1}.`)
  }

  renderAll()
  saveGame()
}

function takeInsurance() {
  if (round.phase !== 'player-turn') {
    return
  }

  if (!round.canInsurance || round.hasTakenAction || round.insuranceBet > 0) {
    return
  }

  const insuranceCost = Math.floor(round.bet / 2)
  if (insuranceCost <= 0 || insuranceCost > player.chips) {
    setMessage('Not enough bankroll for insurance.')
    return
  }

  player.chips -= insuranceCost
  stats.totalWagered += insuranceCost
  round.insuranceBet = insuranceCost
  round.canInsurance = false

  playSound('chip')

  if (dealerHasBlackjack()) {
    const insuranceProfit = insuranceCost * 2
    player.chips += insuranceCost * 3
    stats.totalWon += insuranceProfit
    stats.insuranceWins += 1
    finalizeRound(
      [{ hand: round.hands[0], outcome: 'lose' }],
      'Dealer has blackjack. Insurance paid 2:1.'
    )
    return
  }

  setMessage('Insurance placed. Dealer does not have blackjack.')
  renderAll()
  saveGame()
}

function surrender() {
  if (round.phase !== 'player-turn') {
    return
  }

  if (resolveDealerPeekBeforeAction()) {
    return
  }

  const hand = getActiveHand()
  if (!hand || !canSurrender(hand)) {
    return
  }

  hand.surrendered = true
  hand.finished = true
  round.hasTakenAction = true
  round.canInsurance = false

  finalizeRound([{ hand, outcome: 'surrender' }], 'You surrendered and recovered half your bet.')
}

function resolveDealerPeekBeforeAction() {
  if (!round.canInsurance || round.hasTakenAction) {
    return false
  }

  round.canInsurance = false

  if (dealerHasBlackjack()) {
    finalizeRound([{ hand: round.hands[0], outcome: 'lose' }], 'Dealer has blackjack.')
    return true
  }

  return false
}

function moveToNextHandOrDealer() {
  const nextIndex = round.hands.findIndex(
    (hand, index) => index > round.activeHandIndex && !hand.finished
  )
  if (nextIndex !== -1) {
    round.activeHandIndex = nextIndex
    setMessage(`Playing hand ${nextIndex + 1}.`)
    return
  }

  startDealerTurn()
}

function startDealerTurn() {
  round.phase = 'dealer-turn'
  renderAll()
  setMessage('Dealer is playing...')
  saveGame()

  const step = () => {
    if (round.phase !== 'dealer-turn') {
      return
    }

    const dealerValue = getHandValue(round.dealerHand)
    if (dealerValue.total < DEALER_STAND_TOTAL) {
      round.dealerHand.push(drawCard())
      playSound('deal')
      renderTable()
      renderShoe()
      saveGame()
      setTimeout(step, 450)
      return
    }

    settleAgainstDealer()
  }

  setTimeout(step, 450)
}

function settleAgainstDealer() {
  const outcomes = round.hands.map((hand) => {
    const outcome = Core.resolveHandOutcome(hand.cards, round.dealerHand, {
      splitOrigin: hand.splitOrigin,
      surrendered: hand.surrendered,
    })
    return { hand, outcome }
  })

  finalizeRound(outcomes, summarizeOutcomes(outcomes))
}

function finalizeRound(outcomes, message) {
  round.phase = 'round-over'

  outcomes.forEach(({ hand, outcome }) => {
    applyOutcome(hand, outcome)
    hand.result = { outcome, net: Core.getOutcomeNet(hand.bet, outcome) }
  })

  if (round.insuranceBet > 0 && !dealerHasBlackjack()) {
    stats.totalLost += round.insuranceBet
  }

  let dailyEndedBy = null
  if (challenge.active) {
    challenge.roundsPlayed += 1
    if (challenge.roundsPlayed >= DAILY_ROUND_LIMIT) {
      dailyEndedBy = 'limit'
    } else if (player.chips <= 0) {
      dailyEndedBy = 'bust'
    }
  }

  const netChange = player.chips - (round.chipsBeforeRound ?? player.chips)
  addHistoryEntry(outcomes, netChange)
  checkAchievements()

  let finalMessage = message
  if (dailyEndedBy) {
    completeDailyChallenge(dailyEndedBy)
    finalMessage = `${message} Daily Challenge complete. Your result is saved for today.`
  }

  renderAll()
  setMessage(finalMessage)
  saveGame()

  clearResetTimer()
  resetTimer = setTimeout(() => {
    // Keep the settled cards on the felt until the next deal, but start a clean round.
    const previous = round
    round = createEmptyRound()
    round.hands = previous.hands
    round.dealerHand = previous.dealerHand
    round.settled = true
    if (player.chips <= 0) {
      player.chips = 1000
      setMessage('Bankroll reset to $1000. Place your next bet.')
    } else {
      setMessage('Round complete. Place your next bet.')
    }
    renderAll()
    saveGame()
  }, 2200)
}

function applyOutcome(hand, outcome) {
  const isWin = outcome === 'win' || outcome === 'blackjack'

  stats.totalHands += 1

  switch (outcome) {
    case 'blackjack': {
      const payout = hand.bet * 2.5
      const profit = hand.bet * 1.5
      player.chips += payout
      stats.wins += 1
      stats.blackjacks += 1
      stats.totalWon += profit
      stats.currentStreak += 1
      playSound('win')
      break
    }
    case 'win': {
      const payout = hand.bet * 2
      const profit = hand.bet
      player.chips += payout
      stats.wins += 1
      stats.totalWon += profit
      stats.currentStreak += 1
      playSound('win')
      break
    }
    case 'lose': {
      stats.losses += 1
      stats.totalLost += hand.bet
      stats.currentStreak = 0
      playSound('lose')
      break
    }
    case 'bust': {
      stats.losses += 1
      stats.busts += 1
      stats.totalLost += hand.bet
      stats.currentStreak = 0
      playSound('lose')
      break
    }
    case 'surrender': {
      const refund = hand.bet / 2
      player.chips += refund
      stats.losses += 1
      stats.totalLost += hand.bet / 2
      stats.currentStreak = 0
      playSound('lose')
      break
    }
    case 'push': {
      player.chips += hand.bet
      stats.pushes += 1
      playSound('chip')
      break
    }
    default:
      break
  }

  if (isWin) {
    if (hand.doubled) {
      stats.doubleDownWins += 1
    }
    if (hand.splitOrigin) {
      stats.splitWins += 1
    }
  }

  if (stats.currentStreak > stats.bestStreak) {
    stats.bestStreak = stats.currentStreak
  }

  if (!isWin && outcome !== 'push') {
    stats.currentStreak = 0
  }
}

function addHistoryEntry(outcomes, netChange) {
  const entry = {
    timestamp: Date.now(),
    bet: round.bet,
    netChange,
    outcomes: outcomes.map(({ hand, outcome }, index) => ({
      hand: index + 1,
      outcome,
      bet: hand.bet,
      total: getHandValue(hand.cards).total,
    })),
  }

  history.unshift(entry)
  history = history.slice(0, 60)
}

function summarizeOutcomes(outcomes) {
  if (outcomes.length === 1) {
    const single = outcomes[0].outcome
    if (single === 'blackjack') return 'Blackjack payout secured.'
    if (single === 'win') return 'You win this hand.'
    if (single === 'lose') return 'Dealer wins this hand.'
    if (single === 'push') return 'Push. Bet returned.'
    if (single === 'bust') return 'Bust. House takes the hand.'
    if (single === 'surrender') return 'Surrender complete. Half bet returned.'
  }

  const mapped = outcomes.map(({ outcome }, index) => `H${index + 1}:${outcome.toUpperCase()}`)
  return `Round resolved (${mapped.join(' | ')}).`
}

function getActiveHand() {
  return round.hands[round.activeHandIndex] ?? null
}

function canDouble(hand) {
  return (
    hand.cards.length === 2 &&
    !hand.finished &&
    !hand.doubled &&
    player.chips >= hand.bet &&
    !hand.splitAces
  )
}

function canSplit(hand) {
  if (hand?.cards.length !== 2 || hand.finished) return false
  if (player.chips < hand.bet) return false
  if (round.hands.length >= MAX_SPLIT_HANDS) return false
  return getSplitValue(hand.cards[0].rank) === getSplitValue(hand.cards[1].rank)
}

function canSurrender(hand) {
  if (!hand || hand.finished) return false
  if (round.hands.length > 1) return false
  if (round.hasTakenAction) return false
  return hand.cards.length === 2
}

function dealerHasBlackjack() {
  return getHandValue(round.dealerHand).isBlackjack
}

function renderAll() {
  renderPlayer()
  renderBetting()
  renderTable()
  renderShoe()
  renderButtons()
  renderChallenge()
  renderStats()
  renderHistory()
  renderAchievements()
  updateHint()
  elements['sound-toggle'].checked = !!player.settings.sound
  elements['hints-toggle'].checked = !!player.settings.hints
}

function renderChallenge() {
  const today = getCurrentLocalDateKey()
  const playedToday = Core.hasDailyAttempt(dailyLog, today)
  const result = getDailyResultSummary()
  const net = result ? result.net : 0
  const rounds = result ? result.rounds : 0

  let shoeLabel = "Today's shoe: sealed until you start"
  let statusLabel = playedToday ? 'Played' : 'Ready'
  if (challenge.active) {
    shoeLabel = "Today's shoe: in play"
    statusLabel = 'Active'
  } else if (playedToday) {
    shoeLabel = "Today's shoe: played, new shoe tomorrow"
  }

  elements['challenge-seed'].textContent = shoeLabel
  elements['challenge-status'].textContent = statusLabel
  elements['challenge-rounds'].textContent = `${rounds} / ${DAILY_ROUND_LIMIT}`
  elements['challenge-net'].textContent = `${net >= 0 ? '+' : ''}${formatCurrency(net)}`
  elements['challenge-net'].style.color = net >= 0 ? '#49d17b' : '#ea5a63'

  if (challenge.active) {
    elements['challenge-toggle-btn'].textContent = 'End Daily Challenge'
  } else if (playedToday) {
    elements['challenge-toggle-btn'].textContent = 'Played today'
  } else {
    elements['challenge-toggle-btn'].textContent = 'Start Daily Challenge'
  }
  elements['challenge-toggle-btn'].disabled =
    round.phase !== 'betting' || (!challenge.active && playedToday)
  elements['challenge-share-btn'].disabled = !result || result.rounds === 0

  elements['challenge-panel'].classList.toggle('challenge-active', challenge.active)
}

function renderPlayer() {
  elements['player-el'].textContent = `${player.name} - Bankroll: ${formatCurrency(player.chips)}`
}

function renderBetting() {
  elements['current-bet'].textContent = `Current Bet: ${formatCurrency(round.bet)}`
  elements['bet-stack'].replaceChildren(TableArt.createChipStack(round.bet))
}

function renderShoe() {
  const remaining = shoe.length
  elements['shoe-count'].textContent = String(remaining)
  elements['shoe-meter-fill'].style.width = `${Math.round((remaining / SHOE_SIZE) * 100)}%`
  elements['shoe-el'].setAttribute(
    'aria-label',
    `Shoe: ${remaining} of ${SHOE_SIZE} cards left. Reshuffles between rounds below ${RESHUFFLE_THRESHOLD}.`
  )
}

// Cards that were already on the felt do not re-animate; only newly dealt ones do.
const renderedCardCounts = new WeakMap()

function renderTable() {
  const hideDealerHoleCard = round.phase === 'player-turn'
  elements.felt.classList.toggle('is-resting', round.settled && round.phase === 'betting')

  renderCards(elements['dealer-cards'], round.dealerHand, {
    hideSecondCard: hideDealerHoleCard,
    slots: 2,
  })

  renderPlayerHands()

  const dealerTotal = hideDealerHoleCard
    ? round.dealerHand.length
      ? getCardNumericValue(round.dealerHand[0].rank)
      : null
    : round.dealerHand.length
      ? getHandValue(round.dealerHand).total
      : null

  elements['dealer-sum-el'].textContent =
    dealerTotal === null ? 'Total: --' : `Total: ${dealerTotal}`

  const handCount = round.hands.length
  if (round.phase === 'player-turn' && handCount > 1) {
    elements['active-hand-indicator'].textContent =
      `Hand ${round.activeHandIndex + 1} of ${handCount}`
  } else if (round.phase === 'betting' && round.settled) {
    elements['active-hand-indicator'].textContent =
      handCount > 1 ? `${handCount} hands` : 'Last hand'
  } else {
    elements['active-hand-indicator'].textContent = handCount > 1 ? `${handCount} hands` : 'Hand 1'
  }

  const phaseLabel = {
    betting: 'Idle',
    'player-turn': 'Player',
    'dealer-turn': 'Dealer',
    'round-over': 'Settled',
  }

  elements['dealer-phase'].textContent = phaseLabel[round.phase] || 'Idle'
}

const RESULT_LABELS = {
  blackjack: 'Blackjack',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
  surrender: 'Surrender',
}

function formatSignedCurrency(value) {
  if (value === 0) return ''
  return `${value > 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`
}

function describeHandState(hand, isActive) {
  if (hand.result) {
    return null
  }
  const value = getHandValue(hand.cards)
  if (value.isBust) return 'Bust'
  if (hand.surrendered) return 'Surrendered'
  if (hand.doubled) return 'Doubled'
  if (hand.finished) return value.total === BLACKJACK_TOTAL ? '21' : 'Standing'
  return isActive && round.phase === 'player-turn' ? 'Playing' : 'Waiting'
}

function renderPlayerHands() {
  const container = elements['player-hands']
  container.replaceChildren()
  container.dataset.count = String(round.hands.length)

  if (round.hands.length === 0) {
    const lane = document.createElement('li')
    lane.className = 'hand-lane is-empty'
    const slots = document.createElement('ul')
    slots.className = 'cards-container'
    slots.setAttribute('aria-label', 'Player cards')
    appendEmptySlots(slots, 2)
    lane.append(slots)
    container.append(lane)
    return
  }

  round.hands.forEach((hand, index) => {
    const isActive = round.phase === 'player-turn' && index === round.activeHandIndex
    const value = getHandValue(hand.cards)
    const lane = document.createElement('li')
    lane.className = 'hand-lane'
    if (isActive) {
      lane.classList.add('is-active')
      lane.setAttribute('aria-current', 'true')
    }
    if (hand.result) {
      lane.classList.add(`result-${hand.result.outcome}`)
    }

    const title = round.hands.length > 1 ? `Hand ${index + 1}` : 'Your hand'
    const head = document.createElement('div')
    head.className = 'lane-head'
    const heading = document.createElement('span')
    heading.className = 'lane-title'
    heading.textContent = title
    head.append(heading)

    const state = describeHandState(hand, isActive)
    if (state) {
      const stateTag = document.createElement('span')
      stateTag.className = 'lane-state'
      stateTag.textContent = state
      head.append(stateTag)
    }

    const cardList = document.createElement('ul')
    cardList.className = 'cards-container'
    cardList.setAttribute('aria-label', `${title} cards`)
    renderCards(cardList, hand.cards, { key: hand })

    const foot = document.createElement('div')
    foot.className = 'lane-foot'

    const total = document.createElement('span')
    total.className = 'lane-total'
    total.textContent = `${value.isSoft && !value.isBust && value.total < BLACKJACK_TOTAL ? 'Soft ' : ''}${value.total}`
    total.setAttribute('aria-label', `Total ${value.total}`)

    const bet = document.createElement('span')
    bet.className = 'lane-bet'
    bet.append(TableArt.createChipStack(hand.bet))
    const betText = document.createElement('span')
    betText.className = 'lane-bet-text'
    betText.textContent = formatCurrency(hand.bet)
    betText.setAttribute('aria-label', `Bet ${formatCurrency(hand.bet)}`)
    bet.append(betText)

    foot.append(total, bet)

    lane.append(head, cardList, foot)

    if (hand.result) {
      const result = document.createElement('p')
      result.className = `lane-result result-${hand.result.outcome}`
      const signed = formatSignedCurrency(hand.result.net)
      result.textContent = `${RESULT_LABELS[hand.result.outcome] ?? hand.result.outcome}${signed ? ` ${signed}` : ''}`
      lane.append(result)
    }

    container.append(lane)
  })
}

function appendEmptySlots(container, count) {
  for (let i = 0; i < count; i += 1) {
    const slot = document.createElement('li')
    slot.className = 'card-slot'
    slot.setAttribute('aria-hidden', 'true')
    container.append(slot)
  }
}

function renderCards(container, cards, options = {}) {
  const { hideSecondCard = false, slots = 0, key = cards } = options
  container.replaceChildren()

  if (!cards || cards.length === 0) {
    appendEmptySlots(container, slots)
    return
  }

  const alreadyShown = renderedCardCounts.get(key) ?? 0
  cards.forEach((card, index) => {
    const hidden = hideSecondCard && index === 1
    const animate = !suppressDealAnimation && index >= alreadyShown
    container.append(TableArt.createCardElement(card, { hidden, animate }))
  })
  renderedCardCounts.set(key, cards.length)
}

function renderButtons() {
  const activeHand = getActiveHand()
  const isBetting = round.phase === 'betting'
  const isPlayerTurn = round.phase === 'player-turn'

  elements['start-btn'].disabled = !isBetting || round.bet <= 0 || round.bet > player.chips
  elements['undo-bet-btn'].disabled = !isBetting || round.betStack.length === 0
  elements['clear-bet-btn'].disabled = !isBetting || round.bet === 0

  elements['hit-btn'].disabled =
    !isPlayerTurn || !activeHand || activeHand.finished || activeHand.splitAces
  elements['stand-btn'].disabled = !isPlayerTurn || !activeHand || activeHand.finished
  elements['double-btn'].disabled = !isPlayerTurn || !activeHand || !canDouble(activeHand)
  elements['split-btn'].disabled = !isPlayerTurn || !activeHand || !canSplit(activeHand)
  elements['insurance-btn'].disabled =
    !isPlayerTurn ||
    !round.canInsurance ||
    round.hasTakenAction ||
    round.insuranceBet > 0 ||
    Math.floor(round.bet / 2) > player.chips
  elements['surrender-btn'].disabled = !isPlayerTurn || !activeHand || !canSurrender(activeHand)
}

function renderStats() {
  const winRate = stats.totalHands === 0 ? 0 : (stats.wins / stats.totalHands) * 100
  const netProfit = stats.totalWon - stats.totalLost

  elements['stat-total-hands'].textContent = String(stats.totalHands)
  elements['stat-win-rate'].textContent = `${winRate.toFixed(1)}%`
  elements['stat-total-won'].textContent = formatCurrency(stats.totalWon)
  elements['stat-best-streak'].textContent = String(stats.bestStreak)

  elements['stat-wins'].textContent = String(stats.wins)
  elements['stat-losses'].textContent = String(stats.losses)
  elements['stat-pushes'].textContent = String(stats.pushes)
  elements['stat-blackjacks'].textContent = String(stats.blackjacks)
  elements['stat-busts'].textContent = String(stats.busts)

  elements['stat-current-streak'].textContent = String(stats.currentStreak)
  elements['stat-double-wins'].textContent = String(stats.doubleDownWins)
  elements['stat-split-wins'].textContent = String(stats.splitWins)
  elements['stat-total-wagered'].textContent = formatCurrency(stats.totalWagered)
  elements['stat-net-profit'].textContent = formatCurrency(netProfit)
  elements['stat-net-profit'].style.color = netProfit >= 0 ? '#49d17b' : '#ea5a63'
}

function renderHistory() {
  const container = elements['history-container']
  container.innerHTML = ''

  history.slice(0, 15).forEach((entry) => {
    const row = document.createElement('div')
    row.className = `history-entry ${entry.netChange > 0 ? 'won' : entry.netChange < 0 ? 'lost' : 'push'}`

    const left = document.createElement('div')
    left.className = 'history-entry-left'

    const outcome = document.createElement('div')
    outcome.className = 'history-outcome'
    outcome.textContent = entry.outcomes.map((item) => `H${item.hand} ${item.outcome}`).join(' | ')

    const meta = document.createElement('div')
    meta.className = 'history-meta'
    const time = new Date(entry.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    meta.textContent = `${time} • Bet ${formatCurrency(entry.bet)}`

    left.append(outcome, meta)

    const amount = document.createElement('div')
    amount.className = `history-amount ${entry.netChange > 0 ? 'positive' : entry.netChange < 0 ? 'negative' : 'neutral'}`
    amount.textContent = `${entry.netChange > 0 ? '+' : ''}${formatCurrency(entry.netChange)}`

    row.append(left, amount)
    container.appendChild(row)
  })
}

function renderAchievements() {
  const container = elements['achievements-grid']
  container.innerHTML = ''

  ACHIEVEMENTS.forEach((achievement) => {
    const unlocked = player.achievements.includes(achievement.id)
    const card = document.createElement('div')
    card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`
    card.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.desc}</div>
        `
    container.appendChild(card)
  })
}

function updateHint() {
  if (!player.settings.hints || round.phase !== 'player-turn') {
    elements['hint-el'].textContent = ''
    return
  }

  const hand = getActiveHand()
  if (!hand || hand.finished) {
    elements['hint-el'].textContent = ''
    return
  }

  const hint = getBasicStrategyHint(hand, round.dealerHand[0])
  elements['hint-el'].textContent = hint ? `Hint: ${hint}` : ''
}

function getBasicStrategyHint(hand, dealerUpcard) {
  if (!dealerUpcard) {
    return ''
  }

  const dealerValue = getCardNumericValue(dealerUpcard.rank)
  const values = hand.cards.map((card) => getCardNumericValue(card.rank))
  const handValue = getHandValue(hand.cards)

  if (canSplit(hand)) {
    const [a, b] = values
    if (a === 11 && b === 11) return 'Split aces.'
    if (a === 8 && b === 8) return 'Split 8s.'
    if (a === 10 && b === 10) return 'Stand on 20.'
    if (a === 9 && b === 9)
      return [2, 3, 4, 5, 6, 8, 9].includes(dealerValue) ? 'Split 9s.' : 'Stand.'
    if (a === 7 && b === 7) return dealerValue <= 7 ? 'Split 7s.' : 'Hit.'
    if (a === 6 && b === 6) return [2, 3, 4, 5, 6].includes(dealerValue) ? 'Split 6s.' : 'Hit.'
    if (a === 4 && b === 4) return [5, 6].includes(dealerValue) ? 'Split 4s.' : 'Hit.'
    if (a <= 3 && b <= 3) return [4, 5, 6, 7].includes(dealerValue) ? 'Split small pairs.' : 'Hit.'
  }

  const hasAce = hand.cards.some((card) => card.rank === 'A')
  if (hasAce && hand.cards.length === 2) {
    if (handValue.total >= 19) return 'Stand.'
    if (handValue.total === 18) {
      if ([3, 4, 5, 6].includes(dealerValue) && canDouble(hand))
        return 'Double if allowed, otherwise stand.'
      if ([2, 7, 8].includes(dealerValue)) return 'Stand.'
      return 'Hit.'
    }
    if (handValue.total <= 17) {
      if ([4, 5, 6].includes(dealerValue) && canDouble(hand))
        return 'Double if allowed, otherwise hit.'
      return 'Hit.'
    }
  }

  if (handValue.total >= 17) return 'Stand.'
  if (handValue.total >= 13 && handValue.total <= 16) {
    return dealerValue <= 6 ? 'Stand.' : 'Hit.'
  }
  if (handValue.total === 12) {
    return [4, 5, 6].includes(dealerValue) ? 'Stand.' : 'Hit.'
  }
  if (handValue.total === 11 && canDouble(hand)) return 'Double if allowed, otherwise hit.'
  if (handValue.total === 10 && dealerValue <= 9 && canDouble(hand))
    return 'Double if allowed, otherwise hit.'
  if (handValue.total === 9 && [3, 4, 5, 6].includes(dealerValue) && canDouble(hand))
    return 'Double if allowed, otherwise hit.'
  return 'Hit.'
}

function checkAchievements() {
  const newlyUnlocked = []

  ACHIEVEMENTS.forEach((achievement) => {
    if (!player.achievements.includes(achievement.id) && achievement.check(player, stats)) {
      player.achievements.push(achievement.id)
      newlyUnlocked.push(achievement)
    }
  })

  newlyUnlocked.forEach(showAchievementNotification)
}

function showAchievementNotification(achievement) {
  const node = document.createElement('div')
  node.className = 'achievement-notification'
  node.innerHTML = `
        <div class="achievement-notification-content">
            <span class="achievement-notification-icon">${achievement.icon}</span>
            <div>
                <div><strong>Achievement Unlocked</strong></div>
                <div>${achievement.name}</div>
            </div>
        </div>
    `

  document.body.appendChild(node)
  requestAnimationFrame(() => node.classList.add('show'))
  setTimeout(() => {
    node.classList.remove('show')
    setTimeout(() => node.remove(), 260)
  }, 2400)
}

function setMessage(message) {
  elements['message-el'].textContent = message
}

function formatCurrency(value) {
  const rounded = Math.round(value * 100) / 100
  return `$${rounded.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2, maximumFractionDigits: 2 })}`
}

function getCardNumericValue(rank) {
  return Core.getCardNumericValue(rank)
}

function getSplitValue(rank) {
  return Core.getSplitValue(rank)
}

function getHandValue(cards) {
  return Core.getHandValue(cards)
}

function buildShoe(force) {
  if (!force && shoe.length >= RESHUFFLE_THRESHOLD) {
    return
  }

  if (challenge.active) {
    const challengeSeed = `${challenge.seedDate}:${challenge.reshuffles}`
    shoe = Core.createSeededShoe(challengeSeed, SHOE_DECKS)
    challenge.reshuffles += 1
    challenge.drawn = 0
  } else {
    const freshShoe = Core.createShoe(SHOE_DECKS)
    shoe = Core.shuffle(freshShoe)
  }
}

// Rebuild the shoe a reload interrupted. A daily shoe is rebuilt from its date and the count
// of cards already dealt, so a reload can neither re-roll it nor restart it.
function restoreShoe() {
  if (challenge.active && challenge.reshuffles > 0 && Number.isInteger(challenge.drawn)) {
    const full = Core.createSeededShoe(
      `${challenge.seedDate}:${challenge.reshuffles - 1}`,
      SHOE_DECKS
    )
    const remaining = full.length - challenge.drawn
    if (remaining >= 0) {
      shoe = full.slice(0, remaining)
      return
    }
  }

  const decoded = Core.decodeShoe(savedShoe)
  savedShoe = null
  if (decoded && decoded.length > 0 && !challenge.active) {
    shoe = decoded
    return
  }

  buildShoe(true)
}

function resumeSavedRound() {
  if (!savedRound) {
    return null
  }

  const restored = Core.sanitizeRoundSnapshot(savedRound)
  const staleChips = Number.isFinite(savedRound.chipsBeforeRound)
    ? savedRound.chipsBeforeRound
    : null
  savedRound = null

  if (!restored) {
    if (staleChips !== null) {
      player.chips = staleChips
      resumeNotice = 'Your last round could not be restored, so the bet was returned.'
      saveGame()
    }
    return null
  }

  round = restored
  return restored.phase
}

function drawCard() {
  if (shoe.length === 0) {
    buildShoe(true)
  }

  return Core.drawCard(shoe)
}

function ensureAudioContext() {
  if (!player.settings.sound) {
    return
  }

  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext
    if (Context) {
      audioContext = new Context()
    }
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // Ignore resume errors in restrictive environments.
    })
  }
}

const SOUND_FILES = {
  chip: 'sounds/chip.mp3',
  deal: 'sounds/deal.mp3',
  win: 'sounds/win.mp3',
  lose: 'sounds/lose.mp3',
}
const soundCache = {}

function playSound(type) {
  if (!player.settings.sound) {
    return
  }

  const src = SOUND_FILES[type]
  if (!src) {
    return
  }

  let clip = soundCache[type]
  if (!clip) {
    clip = new Audio(src)
    soundCache[type] = clip
  }

  try {
    clip.currentTime = 0
    clip.play().catch(() => {
      // Ignore autoplay restrictions.
    })
  } catch (_err) {
    // Ignore playback errors in restrictive environments.
  }
}

function saveGame() {
  const resumable = round.phase === 'player-turn' || round.phase === 'dealer-turn'
  if (challenge.active) {
    challenge.drawn = SHOE_SIZE - shoe.length
  }

  const snapshot = {
    version: 2,
    player,
    stats,
    history,
    challenge,
    dailyLog,
    round: resumable ? round : null,
    // A daily shoe is rebuilt from its date and `challenge.drawn`; only a standard shoe is stored.
    shoe: resumable && !challenge.active ? Core.encodeShoe(shoe) : null,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return
  }

  try {
    const data = JSON.parse(raw)
    if (data.player && typeof data.player === 'object') {
      player = {
        ...player,
        ...data.player,
        settings: {
          ...player.settings,
          ...(data.player.settings || {}),
        },
        achievements: Array.isArray(data.player.achievements) ? data.player.achievements : [],
      }
    }

    if (data.stats && typeof data.stats === 'object') {
      stats = {
        ...createDefaultStats(),
        ...data.stats,
      }
    }

    history = Array.isArray(data.history) ? data.history : []

    if (data.challenge && typeof data.challenge === 'object') {
      challenge = {
        ...createDefaultChallenge(),
        ...data.challenge,
      }
    }

    dailyLog = Core.sanitizeDailyLog(data.dailyLog)
    // A legacy active challenge predates the log: record it so it cannot be restarted today.
    if (challenge.active && !Core.hasDailyAttempt(dailyLog, challenge.seedDate)) {
      dailyLog = Core.startDailyAttempt(dailyLog, challenge.seedDate)
    }

    savedRound = data.round ?? null
    savedShoe = typeof data.shoe === 'string' ? data.shoe : null
  } catch (error) {
    console.warn('Failed to load saved game state:', error)
  }
}

function clearResetTimer() {
  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
}
