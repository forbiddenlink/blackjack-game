# Daily Challenge Design

## Objective
Add a portfolio-distinct feature that combines product polish with technical depth: a deterministic Daily Challenge mode with shareable results.

## Design

1. Add deterministic seeded shuffling to the core module.
- Implemented `createSeededRng(seed)` and `createSeededShoe(seed, decks)` in `blackjack-core.js`.
- Daily challenge shoes now produce repeatable card order for the same seed.

2. Add challenge UI controls and telemetry.
- Added a dedicated Daily Challenge panel with seed, status, rounds, and net performance.
- Added start/end toggle and share result action.

3. Wire challenge state into runtime + persistence.
- Added challenge state (`active`, `seedDate`, `roundsPlayed`, `startingChips`, `reshuffles`) to `index.js`.
- Challenge state now persists via `localStorage`.

4. Preserve deterministic behavior through reshuffles.
- Reshuffles in challenge mode derive from seed + reshuffle counter to remain reproducible.

5. Validate with tests.
- Added deterministic-shoe test coverage in `tests/blackjack-core.test.js`.

## Result
The app now includes a highly demoable feature with deterministic logic, clear UX affordances, and supporting automated tests.
