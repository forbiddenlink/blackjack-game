# Blackjack Studio

A browser blackjack game built with vanilla HTML, CSS and JavaScript. It has no framework and no build step.

## Features

### Gameplay
- 6-deck shoe with reshuffle behavior.
- Daily Challenge: a seeded shoe keyed by local date, limited to 20 rounds per day (`DAILY_ROUND_LIMIT`).
- Standard hand actions: Hit, Stand, Double, Split, Insurance, Surrender.
- Split up to 4 hands.
- Split aces follow one-card rule.
- Dealer stands on 17 (`DEALER_STAND_TOTAL` in `blackjack-core.js`).
- Blackjack payout 3:2.

### Stats and progression
- Stats, bankroll, achievements and history persist in `localStorage`.
- Win/loss/push tracking, streak tracking, and net profit calculations.
- Achievement system with unlock notifications.
- Recent-hands feed with per-round net result.
- Shareable Daily Challenge result summary.

### Interface
- Keyboard support: `H`, `S`, `D`, `P`, `I`, `R`.
- Quick bet controls (`Undo`, `Clear`) and chip-based betting UX.
- Sound toggle and strategy-hint toggle.
- Responsive layout, semantic regions, live status updates and `prefers-reduced-motion` support.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- `http-server` for local serving
- Biome for lint and format
- PostHog analytics (`posthog.js`), loaded from `us.posthog.com`
- Node built-in test runner (`node:test`) for deterministic unit tests

## Project structure

```text
blackjack-game/
├── blackjack-core.js     pure game logic
├── cards.js
├── index.html
├── index.css
├── index.js              engine and UI
├── posthog.js            analytics loader
├── sounds/               chip, deal, win, lose
├── tests/                blackjack-core.test.js, storage.test.js
├── .github/workflows/
├── package.json
└── README.md
```

## Run locally

Requires Node.js 22 (as in CI) and pnpm.

```bash
pnpm install
pnpm start
```

Open `http://127.0.0.1:8080`.

## Test and lint

```bash
pnpm test           # node:test suites, plus node --check on each script
pnpm biome:check    # lint and format check
pnpm check          # biome:check, test and build
```

## Quality gates

- Tests: `tests/blackjack-core.test.js` and `tests/storage.test.js`.
- CI: `.github/workflows/ci.yml` runs on pushes and pull requests.

## Code map

- `index.js`: round engine and UI logic.
- `blackjack-core.js`: pure blackjack logic.
- `index.css`: visual system and responsiveness.
- `index.html`: document structure and accessibility markup.

## Analytics

`posthog.js` loads PostHog from `us.posthog.com` with a project key that is public by design (see `.gitleaksignore`). Remove the `posthog.js` script tag in `index.html` to run without analytics.

## Roadmap

Not built yet: full round-state tests for `index.js`, browser smoke tests (Playwright) and a card-count trainer mode.

## License

MIT. See [LICENSE](LICENSE).
