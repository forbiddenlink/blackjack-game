// Table art: inline-SVG card faces and CSS chip stacks. No external assets.
// Depends on blackjack-core.js (naming helpers) and the <symbol> sprite in index.html.
;(function bootstrapTableArt(globalScope) {
  const Core = globalScope.BlackjackCore
  if (!Core) {
    throw new Error('BlackjackCore is missing. Ensure blackjack-core.js loads before cards.js.')
  }

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const SUIT_SYMBOL = { '♠': 'suit-s', '♥': 'suit-h', '♦': 'suit-d', '♣': 'suit-c' }
  const FACE_RANKS = ['J', 'Q', 'K']

  // Pip layouts on a 3-column grid: [column 0..2, row fraction 0..1].
  const PIP_LAYOUT = {
    2: [
      [1, 0],
      [1, 1],
    ],
    3: [
      [1, 0],
      [1, 0.5],
      [1, 1],
    ],
    4: [
      [0, 0],
      [2, 0],
      [0, 1],
      [2, 1],
    ],
    5: [
      [0, 0],
      [2, 0],
      [1, 0.5],
      [0, 1],
      [2, 1],
    ],
    6: [
      [0, 0],
      [2, 0],
      [0, 0.5],
      [2, 0.5],
      [0, 1],
      [2, 1],
    ],
    7: [
      [0, 0],
      [2, 0],
      [1, 0.25],
      [0, 0.5],
      [2, 0.5],
      [0, 1],
      [2, 1],
    ],
    8: [
      [0, 0],
      [2, 0],
      [1, 0.25],
      [0, 0.5],
      [2, 0.5],
      [1, 0.75],
      [0, 1],
      [2, 1],
    ],
    9: [
      [0, 0],
      [2, 0],
      [0, 1 / 3],
      [2, 1 / 3],
      [1, 0.5],
      [0, 2 / 3],
      [2, 2 / 3],
      [0, 1],
      [2, 1],
    ],
    10: [
      [0, 0],
      [2, 0],
      [1, 1 / 6],
      [0, 1 / 3],
      [2, 1 / 3],
      [0, 2 / 3],
      [2, 2 / 3],
      [1, 5 / 6],
      [0, 1],
      [2, 1],
    ],
  }

  const PIP_SIZE = 13
  const PIP_COLUMN_X = [17, 28.5, 40]
  const PIP_TOP = 16
  const PIP_SPAN = 53

  function svgNode(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag)
    Object.entries(attrs).forEach(([name, value]) => {
      node.setAttribute(name, String(value))
    })
    return node
  }

  function suitUse(suit, x, y, size, rotateAround) {
    const use = svgNode('use', {
      href: `#${SUIT_SYMBOL[suit]}`,
      x,
      y,
      width: size,
      height: size,
    })
    if (rotateAround) {
      use.setAttribute('transform', `rotate(180 ${rotateAround[0]} ${rotateAround[1]})`)
    }
    return use
  }

  function cornerIndex(card, flipped) {
    const group = svgNode('g')
    if (flipped) group.setAttribute('transform', 'rotate(180 35 49)')
    const text = svgNode('text', {
      x: 8.5,
      y: 14,
      'text-anchor': 'middle',
      'font-size': card.rank === '10' ? 11.5 : 14,
      'font-weight': 700,
      'letter-spacing': card.rank === '10' ? -0.8 : 0,
      class: 'card-index-text',
    })
    text.textContent = card.rank
    group.append(text, suitUse(card.suit, 4, 16.5, 9))
    return group
  }

  function buildFace(card) {
    const group = svgNode('g')
    group.append(cornerIndex(card, false), cornerIndex(card, true))

    if (card.rank === 'A') {
      group.append(suitUse(card.suit, 20, 33, 30))
      return group
    }

    if (FACE_RANKS.includes(card.rank)) {
      group.append(
        svgNode('rect', {
          x: 18,
          y: 14,
          width: 34,
          height: 70,
          rx: 3,
          class: 'card-face-frame',
        })
      )
      const letter = svgNode('text', {
        x: 35,
        y: 59,
        'text-anchor': 'middle',
        'font-size': 36,
        'font-weight': 700,
        class: 'card-face-letter',
      })
      letter.textContent = card.rank
      group.append(letter, suitUse(card.suit, 29, 17, 12), suitUse(card.suit, 29, 69, 12, [35, 49]))
      return group
    }

    const layout = PIP_LAYOUT[card.rank] ?? []
    layout.forEach(([column, row]) => {
      const x = PIP_COLUMN_X[column]
      const y = PIP_TOP + row * PIP_SPAN
      group.append(
        suitUse(card.suit, x, y, PIP_SIZE, row > 0.5 ? [x + PIP_SIZE / 2, y + PIP_SIZE / 2] : null)
      )
    })
    return group
  }

  function createCardElement(card, options = {}) {
    const { hidden = false, animate = false } = options
    const node = document.createElement('li')
    node.className = 'card'
    if (animate) node.classList.add('dealing')

    const root = svgNode('svg', {
      viewBox: '0 0 70 98',
      role: 'img',
      focusable: 'false',
      'aria-label': hidden ? 'Face-down card' : Core.describeCard(card),
    })

    if (hidden) {
      node.classList.add('hidden')
      root.append(
        svgNode('rect', { x: 0.5, y: 0.5, width: 69, height: 97, rx: 6, class: 'card-back-base' }),
        svgNode('rect', {
          x: 5,
          y: 5,
          width: 60,
          height: 88,
          rx: 3,
          fill: 'url(#card-back-pattern)',
          class: 'card-back-inner',
        })
      )
      node.append(root)
      return node
    }

    if (card.suit === '♥' || card.suit === '♦') node.classList.add('red')
    root.append(
      svgNode('rect', { x: 0.5, y: 0.5, width: 69, height: 97, rx: 6, class: 'card-paper' }),
      buildFace(card)
    )
    node.append(root)
    return node
  }

  const CHIP_COLUMN_CAP = 8

  // Side-view chip columns, one column per denomination, drawn from Core.breakIntoChips.
  function createChipStack(amount) {
    const stack = document.createElement('div')
    stack.className = 'chip-stack'
    stack.setAttribute('aria-hidden', 'true')

    Core.breakIntoChips(amount).forEach(({ value, count }) => {
      const column = document.createElement('div')
      column.className = 'chip-column'
      for (let i = 0; i < Math.min(count, CHIP_COLUMN_CAP); i += 1) {
        const chip = document.createElement('span')
        chip.className = 'stack-chip'
        chip.dataset.value = String(value)
        column.append(chip)
      }
      stack.append(column)
    })

    return stack
  }

  globalScope.TableArt = { createCardElement, createChipStack }
})(typeof globalThis !== 'undefined' ? globalThis : this)
