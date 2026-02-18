# Blackjack Studio

A portfolio-grade blackjack simulator built with vanilla HTML, CSS, and JavaScript.

![Blackjack Studio hero screenshot placeholder](https://dummyimage.com/1200x630/08131f/e8f0f7&text=Blackjack+Studio)

## Why this project is portfolio-ready

- Clear product framing and visual identity (casino-inspired interface, responsive layout, polished typography).
- Stateful game engine with multi-deck shoe behavior and reliable hand resolution logic.
- Advanced gameplay support: split, double down, insurance, and surrender.
- Daily Challenge mode with deterministic seeded shoe for comparable runs.
- Strategy-hint mode that can be toggled on/off.
- Persistent data layer using `localStorage` for profile, stats, achievements, and history.
- Accessibility-aware interactions: semantic regions, keyboard shortcuts, live status updates, and reduced-motion support.
- Modular architecture with a reusable core logic layer and automated test coverage.

## Feature set

### Gameplay
- 6-deck shoe with reshuffle behavior.
- Deterministic Daily Challenge shoe keyed by local date.
- Standard hand actions: Hit, Stand, Double, Split, Insurance, Surrender.
- Split up to 4 hands.
- Split aces follow one-card rule.
- Dealer stands on all 17 values.
- Blackjack payout 3:2.

### Analytics + progression
- Session-independent stats and bankroll persistence.
- Win/loss/push tracking, streak tracking, and net profit calculations.
- Achievement system with unlock notifications.
- Recent-hands feed with per-round net result.
- Shareable Daily Challenge result summary.

### UX quality
- Keyboard support: `H`, `S`, `D`, `P`, `I`, `R`.
- Quick bet controls (`Undo`, `Clear`) and chip-based betting UX.
- Sound toggle and hint toggle.
- Mobile and desktop optimized layout.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- `http-server` for local serving
- Node built-in test runner (`node:test`) for deterministic unit tests

## Project structure

```text
/Volumes/LizsDisk/blackjack-game
├── blackjack-core.js
├── .github/workflows/ci.yml
├── index.html
├── index.css
├── index.js
├── tests/blackjack-core.test.js
├── package.json
├── package-lock.json
└── README.md
```

## Run locally

```bash
npm install
npm start
```

Open `http://127.0.0.1:8080`.

## Validate locally

```bash
npm test
```

## Quality gates

- Core logic tests: `tests/blackjack-core.test.js`
- Browser script syntax check: `node --check index.js`
- CI pipeline: `.github/workflows/ci.yml` runs on pushes and pull requests

## Notes for reviewers

- Main engine and UI logic live in `/Volumes/LizsDisk/blackjack-game/index.js`.
- Pure blackjack logic lives in `/Volumes/LizsDisk/blackjack-game/blackjack-core.js`.
- Visual system and responsiveness live in `/Volumes/LizsDisk/blackjack-game/index.css`.
- Accessibility and semantic document structure live in `/Volumes/LizsDisk/blackjack-game/index.html`.

## Next improvements (optional)

- Add deterministic test coverage for full round-state transitions in `index.js`.
- Add smoke-style browser tests (Playwright) for key UI flows.
- Add optional card-count trainer mode.
