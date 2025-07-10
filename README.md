# Blackjack Game

A modern, interactive Blackjack game built with HTML, CSS, and JavaScript. Play against the dealer, manage your bets, and try your luck at hitting 21!

## Features

- 🎮 Interactive gameplay with a clean, modern interface
- 💰 Betting system with multiple chip denominations ($5, $25, $100, $500)
- 👤 Customizable player names
- 🎲 Standard Blackjack rules and payouts
- 🎯 Multiple game actions: Hit, Stand, Double Down
- 💫 Real-time game statistics and balance tracking

## Getting Started

### Prerequisites

- Node.js (version 12 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
```bash
git clone git@github.com:forbiddenlink/blackjack-game.git
cd blackjack-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:8080`

## How to Play

1. Enter your name and click "SET NAME"
2. Select your bet amount using the chip denominations
3. Click "START GAME" to begin
4. Choose your action:
   - HIT: Take another card
   - STAND: Keep your current hand
   - DOUBLE: Double your bet and receive one more card

## Game Rules

- Get as close to 21 as possible without going over
- Face cards (J, Q, K) are worth 10
- Aces are worth 1 or 11
- Blackjack (Ace + 10-value card) pays 3:2
- Dealer must hit on 16 or less and stand on 17 or more
- Players can double down on their initial hand

## Development

### Project Structure
```
blackjack-game/
  ├── index.html      # Main HTML file
  ├── index.css       # Styles
  ├── index.js        # Game logic
  ├── package.json    # Dependencies and scripts
  └── README.md       # Documentation
```

### Available Scripts

- `npm start`: Starts the development server
- `npm run build`: Builds the project
- `npm run watch`: Watches for changes and rebuilds

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
