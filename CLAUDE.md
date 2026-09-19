# Blackjack Studio

Portfolio-grade blackjack simulator built with vanilla HTML, CSS, and JavaScript. Static site,
no framework, no build step.

## Stack

- Vanilla JavaScript (ES6+), HTML5, CSS3
- `http-server` for local serving
- Node's built-in test runner (`node:test`), not a third-party test framework
- Biome for lint/format
- Package manager: pnpm (`pnpm-lock.yaml`, `packageManager: pnpm@10.34.5`); the README's
  quick-start section names the wrong one

## Commands

- `pnpm start` - serves the static files (`http-server -c-1 .`) at `http://127.0.0.1:8080`
- `pnpm test` - runs `tests/*.test.js` via `node --test`, then syntax-checks
  `blackjack-core.js`, `index.js`, and `posthog.js` with `node --check`
- `pnpm run test:watch` - watch mode
- `pnpm run build` - no-op (static project, prints a message)
- `pnpm run check` - biome check + test + build
- `pnpm run biome:check` / `pnpm run biome:fix` / `pnpm run biome:format`
- `pnpm run security` / `pnpm run audit` - `pnpm audit --audit-level high`

## Layout

- `index.html` - document structure, accessibility/semantic markup
- `index.js` - main engine and UI logic
- `blackjack-core.js` - pure blackjack game logic (deck, hand resolution, payouts), separated
  so it can be unit tested without a DOM
- `index.css` - visual system and responsive layout
- `posthog.js` - PostHog analytics init (client-side project token, not a secret)
- `sounds/` - game sound effects
- `tests/blackjack-core.test.js` - unit tests for the core logic
- `docs/` - project docs
- `.github/workflows/ci.yml` - runs `pnpm install --frozen-lockfile` then `pnpm test` on
  push/PR

## Gameplay conventions (for anyone touching game logic)

- 6-deck shoe with reshuffle; deterministic Daily Challenge shoe keyed by local date.
- Actions: Hit, Stand, Double, Split (up to 4 hands, split aces get one card only), Insurance,
  Surrender.
- Dealer stands on all 17s. Blackjack pays 3:2.
- Keyboard shortcuts: `H`, `S`, `D`, `P`, `I`, `R`.
- Persistence (profile, stats, achievements, history) uses `localStorage`, no backend.

## Testing

`tests/blackjack-core.test.js` covers the core logic layer only; `index.js` (UI/state wiring)
has no dedicated test coverage beyond the syntax check in `pnpm test`.

## Gotchas

- No environment variables or `.env` files; the PostHog token in `posthog.js` is a public
  client-side project key, not a secret to rotate.
- README's project-structure section and quick-start instructions reference the wrong
  package manager and its lockfile name; the real lockfile is `pnpm-lock.yaml`.
