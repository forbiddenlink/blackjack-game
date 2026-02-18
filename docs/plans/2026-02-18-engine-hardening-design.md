# Engine Hardening and CI Design

## Objective
Move the blackjack project from a polished demo to an interview-ready engineering artifact by introducing modular architecture, deterministic tests, and continuous integration.

## Approach

1. Isolate game rules into a reusable core module.
- Added `blackjack-core.js` as a pure logic layer with no DOM dependencies.
- Exposed helpers for card values, hand scoring, shoe creation/shuffle, card draws, and hand outcome resolution.

2. Connect UI shell to shared core.
- `index.js` now treats `BlackjackCore` as the source of truth for game rule primitives.
- Eliminated duplicated rule logic in the UI script.

3. Add deterministic tests.
- Added `tests/blackjack-core.test.js` using Node’s built-in test runner.
- Covered shoe generation, deterministic shuffling, draw behavior, hand valuation (including soft totals), and key outcome resolution paths.

4. Add CI enforcement.
- Added `.github/workflows/ci.yml` to run `npm ci` and `npm test` on push and pull requests.
- Updated npm scripts to run tests plus browser script syntax checks.

## Result
The project now demonstrates both product quality and engineering quality: clean separation of concerns, regression protection, and repeatable validation in CI.
