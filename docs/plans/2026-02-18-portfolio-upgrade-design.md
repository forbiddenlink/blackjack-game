# Blackjack Studio Portfolio Upgrade Design

## Goal
Elevate the original blackjack game into a portfolio-caliber frontend project by improving product quality across gameplay correctness, visual design, accessibility, maintainability, and documentation.

## Key Decisions

1. Replace monolithic legacy styling with a cohesive design system.
- Introduced a distinct visual identity with layered gradients, custom typography pairing, and panelized layout.
- Rebuilt responsive behavior so the app reads well on mobile and desktop.

2. Rebuild game flow around explicit round state.
- Added explicit phases (`betting`, `player-turn`, `dealer-turn`, `round-over`).
- Centralized action guards for split, double, surrender, and insurance eligibility.

3. Improve rules fidelity.
- Implemented a finite 6-deck shoe with reshuffle threshold.
- Added complete split-hand progression and cap of 4 hands.
- Added split-aces one-card rule.
- Added dealer-stand-on-17 behavior and 3:2 blackjack payout.

4. Add portfolio-oriented product depth.
- Added strategy hint mode as a demonstrable feature toggle.
- Added richer performance and result tracking.
- Preserved persistence for profile, settings, stats, achievements, and history.

5. Accessibility and interaction upgrades.
- Added semantic sections and ARIA live region status updates.
- Added keyboard shortcuts and robust focus-visible states.
- Preserved reduced-motion support.

## Tradeoffs

- Kept implementation as a single-page vanilla JS app to keep review friction low.
- Did not introduce a build framework; simplified toolchain to static serving and syntax checks.

## Validation

- JavaScript syntax validated via `node --check index.js`.
- Element ID wiring validated with a script comparing JS selectors to HTML IDs.
- Runtime browser validation attempted; local Playwright runtime was unavailable in this environment.
