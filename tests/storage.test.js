const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const Core = require('../blackjack-core.js')
const source = fs.readFileSync(require('node:path').join(__dirname, '../index.js'), 'utf8')
function app(storage) {
  const nodes = new Map()
  const context = vm.createContext({ window: { BlackjackCore: Core }, localStorage: storage, console,
    document: { addEventListener() {}, getElementById(id) { if (!nodes.has(id)) nodes.set(id, { hidden: true, textContent: '' }); return nodes.get(id) } } })
  vm.runInContext(source, context)
  vm.runInContext('cacheElements()', context)
  return { run: code => vm.runInContext(code, context), nodes }
}
test('blocked storage keeps the game in memory and displays a persistent warning', () => {
  let writes = 0
  const a = app({ getItem() { throw Error('blocked') }, setItem() { writes++; throw Error('blocked') } })
  assert.doesNotThrow(() => a.run('loadGame(); player.chips = 321; saveGame()'))
  assert.equal(a.run('player.chips'), 321)
  assert.equal(writes, 0)
  assert.equal(a.nodes.get('storage-warning').hidden, false)
  assert.match(a.nodes.get('storage-warning').textContent, /session only/i)
  a.run('setMessage("Your move")')
  assert.match(a.nodes.get('storage-warning').textContent, /lost/i)
})
test('quota failure stops further persistence attempts without losing memory state', () => {
  let writes = 0
  const a = app({ getItem: () => null, setItem() { writes++; throw Error('quota') } })
  assert.doesNotThrow(() => a.run('loadGame(); saveGame(); player.chips = 456; saveGame()'))
  assert.equal(writes, 1)
  assert.equal(a.run('player.chips'), 456)
  assert.equal(a.nodes.get('storage-warning').hidden, false)
})
test('available storage still saves normally without showing the warning', () => {
  let saved
  const a = app({ getItem: () => null, setItem: (_, value) => { saved = value } })
  a.run('loadGame(); saveGame()')
  assert.equal(JSON.parse(saved).version, 2)
  assert.equal(a.nodes.get('storage-warning').hidden, true)
})
