// Game state
let player = {
    name: 'Player',
    chips: 1000,
    wins: 0,
    losses: 0,
    ties: 0,
    currentBet: 0
};

let gameState = {
    bet: 0,
    playerHand: [],
    dealerHand: [],
    gameOver: true,
    canDoubleDown: true,
    splitHands: [[], []],
    activeHand: 0,
    isSplit: false,
    stats: {
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
        longestStreak: 0,
        sessionStartTime: Date.now()
    }
};

// Functions that don't depend on DOM elements
function getRandomCard() {
    const cards = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits = ['♠', '♥', '♦', '♣'];
    const card = cards[Math.floor(Math.random() * cards.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    return { value: card, suit: suit };
}

function getCardValue(card) {
    if (card === 'A') return 11;
    if (['K', 'Q', 'J'].includes(card)) return 10;
    return parseInt(card);
}

function calculateHandValue(hand) {
    let sum = 0;
    let aces = 0;
    
    for (let card of hand) {
        if (card.value === 'A') {
            aces += 1;
        } else {
            sum += getCardValue(card.value);
        }
    }
    
    for (let i = 0; i < aces; i++) {
        if (sum + 11 <= 21) {
            sum += 11;
        } else {
            sum += 1;
        }
    }
    
    return sum;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        playerNameInput: document.getElementById('player-name-input'),
        setNameBtn: document.getElementById('set-name-btn'),
        playerEl: document.getElementById('player-el'),
        messageEl: document.getElementById('message-el'),
        dealerCardsEl: document.getElementById('dealer-cards'),
        dealerSumEl: document.getElementById('dealer-sum-el'),
        cardsEl: document.getElementById('cards-el'),
        sumEl: document.getElementById('sum-el'),
        currentBetEl: document.getElementById('current-bet'),
        startButton: document.getElementById('start-btn'),
        hitButton: document.getElementById('hit-btn'),
        standButton: document.getElementById('stand-btn'),
        doubleButton: document.getElementById('double-btn'),
        gotItButton: document.getElementById('got-it-btn'),
        rulesSection: document.querySelector('.rules-section')
    };

    // Verify all elements are found
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Could not find element with ID: ${key}`);
            return; // Exit initialization if any element is missing
        }
    }

    // Add Got It button handler
    elements.gotItButton.addEventListener('click', () => {
        elements.rulesSection.style.display = 'none';
    });

    // Functions that depend on DOM elements
    function updateStats() {
        elements.playerEl.textContent = `${player.name} - Chips: $${player.chips}`;
    }

    function updateBetDisplay() {
        elements.currentBetEl.textContent = `Current Bet: $${gameState.bet}`;
    }

    function updateButtonStates() {
        elements.startButton.disabled = gameState.bet <= 0 || gameState.bet > player.chips;
        elements.hitButton.disabled = gameState.gameOver;
        elements.standButton.disabled = gameState.gameOver;
        elements.doubleButton.disabled = gameState.gameOver || !gameState.canDoubleDown || gameState.bet * 2 > player.chips;
    }

    // Initialize game state
    updateStats();
    updateBetDisplay();
    updateButtonStates();
    elements.messageEl.textContent = 'Welcome! Enter your name to start playing.';

    // Set up name input handler
    function setPlayerName() {
        const name = elements.playerNameInput.value.trim();
        if (name) {
            player.name = name;
            elements.playerEl.textContent = `${name} - Chips: $${player.chips}`;
            elements.playerNameInput.value = '';
            elements.messageEl.textContent = `Welcome, ${name}!`;
        }
    }

    elements.setNameBtn.addEventListener('click', setPlayerName);
    elements.playerNameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            setPlayerName();
        }
    });

    // Set up betting handlers
    const chipButtons = document.querySelectorAll('.chip-button');
    chipButtons.forEach(button => {
        button.addEventListener('click', () => {
            const value = parseInt(button.getAttribute('data-value'));
            const newBet = gameState.bet + value;
            if (newBet >= 0 && newBet <= player.chips) {
                gameState.bet = newBet;
                player.currentBet = newBet;
                updateBetDisplay();
                updateButtonStates();
                elements.messageEl.textContent = `Current bet: $${gameState.bet}`;
            } else if (newBet > player.chips) {
                elements.messageEl.textContent = "You don't have enough chips!";
            }
        });
    });

    // Set up game control buttons
    elements.startButton.addEventListener('click', startGame);
    elements.hitButton.addEventListener('click', hit);
    elements.standButton.addEventListener('click', stand);
    elements.doubleButton.addEventListener('click', doubleDown);

    // Set up surrender button
    const surrenderButton = document.getElementById('surrender-button');
    if (surrenderButton) {
        surrenderButton.addEventListener('click', surrender);
    }

    // Functions that depend on DOM elements
    function renderGameState() {
        // Clear previous cards
        elements.dealerCardsEl.innerHTML = '';
        elements.cardsEl.innerHTML = '';

        // Render dealer's cards
        gameState.dealerHand.forEach((card, index) => {
            const isHidden = index === 1 && !gameState.gameOver;
            const cardElement = createCardElement(card, isHidden);
            elements.dealerCardsEl.appendChild(cardElement);
        });

        // Render player's cards
        gameState.playerHand.forEach(card => {
            const cardElement = createCardElement(card);
            elements.cardsEl.appendChild(cardElement);
        });

        // Update sums
        const dealerSum = gameState.gameOver ? calculateHandValue(gameState.dealerHand) : calculateHandValue([gameState.dealerHand[0]]);
        elements.dealerSumEl.textContent = `Sum: ${dealerSum}`;
        elements.sumEl.textContent = `Sum: ${calculateHandValue(gameState.playerHand)}`;
    }

    function createCardElement(card, isHidden = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        
        if (isHidden) {
            cardDiv.classList.add('hidden');
            cardDiv.innerHTML = '<div class="card-back"></div>';
        } else {
            // Add color class for hearts and diamonds
            if (card.suit === '♥' || card.suit === '♦') {
                cardDiv.classList.add('red');
            }
            
            // Create the top value and suit
            const topValue = document.createElement('div');
            topValue.className = 'value top';
            topValue.textContent = card.value;
            
            const topSuit = document.createElement('div');
            topSuit.className = 'suit top';
            topSuit.textContent = card.suit;
            
            // Create center suit
            const centerSuit = document.createElement('div');
            centerSuit.className = 'center-suit';
            centerSuit.textContent = card.suit;
            
            // Create bottom value and suit (rotated 180deg)
            const bottomValue = document.createElement('div');
            bottomValue.className = 'value bottom';
            bottomValue.textContent = card.value;
            
            const bottomSuit = document.createElement('div');
            bottomSuit.className = 'suit bottom';
            bottomSuit.textContent = card.suit;
            
            // Append all elements
            cardDiv.appendChild(topValue);
            cardDiv.appendChild(topSuit);
            cardDiv.appendChild(centerSuit);
            cardDiv.appendChild(bottomValue);
            cardDiv.appendChild(bottomSuit);
        }
        
        return cardDiv;
    }

    // Make functions available globally
    window.setPlayerName = function() {
        const name = elements.playerNameInput.value.trim();
        if (name) {
            player.name = name;
            elements.playerEl.textContent = name;
            elements.playerNameInput.value = '';
            elements.messageEl.textContent = `Welcome, ${name}!`;
        }
    };

    window.closeRules = function() {
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal) {
            rulesModal.style.display = 'none';
        }
    };

    window.changeBet = function(amount) {
        const newBet = gameState.bet + amount;
        if (newBet >= 0 && newBet <= player.chips) {
            gameState.bet = newBet;
            player.currentBet = newBet;
            updateBetDisplay();
            updateButtonStates();
        }
    };

    function startGame() {
        if (gameState.bet <= 0 || gameState.bet > player.chips) {
            elements.messageEl.textContent = 'Please place a valid bet';
            return;
        }

        // Deduct bet from chips
        player.chips -= gameState.bet;
        updateStats();

        // Deal initial cards
        gameState.playerHand = [getRandomCard(), getRandomCard()];
        gameState.dealerHand = [getRandomCard(), getRandomCard()];
        gameState.gameOver = false;
        gameState.canDoubleDown = true;

        // Render game state
        renderGameState();
        updateButtonStates();

        // Check for blackjack
        const playerValue = calculateHandValue(gameState.playerHand);
        if (playerValue === 21) {
            setTimeout(() => {
                endGame('blackjack');
            }, 1000);
        } else {
            elements.messageEl.textContent = 'Hit or Stand?';
        }
    }

    function hit() {
        if (gameState.gameOver) return;
        
        gameState.playerHand.push(getRandomCard());
        gameState.canDoubleDown = false;
        
        const handValue = calculateHandValue(gameState.playerHand);
        renderGameState();
        updateButtonStates();
        
        if (handValue > 21) {
            endGame('bust');
        } else if (handValue === 21) {
            stand();
        }
    }

    function stand() {
        if (gameState.gameOver) return;
        
        gameState.gameOver = true;
        dealerPlay();
    }

    function doubleDown() {
        if (gameState.gameOver || !gameState.canDoubleDown || gameState.bet * 2 > player.chips) return;
        
        player.chips -= gameState.bet;
        gameState.bet *= 2;
        updateStats();
        updateBetDisplay();
        
        gameState.playerHand.push(getRandomCard());
        renderGameState();
        
        const handValue = calculateHandValue(gameState.playerHand);
        if (handValue > 21) {
            endGame('bust');
        } else {
            stand();
        }
    }

    function surrender() {
        if (gameState.gameOver) return;

        player.chips += gameState.bet / 2;
        endGame('surrender');
    }

    function dealerPlay() {
        let dealerValue = calculateHandValue(gameState.dealerHand);
        
        while (dealerValue < 17) {
            gameState.dealerHand.push(getRandomCard());
            dealerValue = calculateHandValue(gameState.dealerHand);
        }
        
        renderGameState();
        
        if (dealerValue > 21) {
            endGame('dealer_bust');
        } else {
            const playerValue = calculateHandValue(gameState.playerHand);
            if (dealerValue > playerValue) {
                endGame('dealer_wins');
            } else if (dealerValue < playerValue) {
                endGame('player_wins');
            } else {
                endGame('push');
            }
        }
    }

    function endGame(result) {
        gameState.gameOver = true;
        updateButtonStates();
        renderGameState(); // Show all cards including dealer's hidden card
        
        switch (result) {
            case 'blackjack':
                player.chips += gameState.bet * 2.5;
                elements.messageEl.textContent = 'Blackjack! You win!';
                break;
            case 'bust':
                elements.messageEl.textContent = 'Bust! You lose!';
                break;
            case 'dealer_bust':
                player.chips += gameState.bet * 2;
                elements.messageEl.textContent = 'Dealer busts! You win!';
                break;
            case 'dealer_wins':
                elements.messageEl.textContent = 'Dealer wins!';
                break;
            case 'player_wins':
                player.chips += gameState.bet * 2;
                elements.messageEl.textContent = 'You win!';
                break;
            case 'push':
                player.chips += gameState.bet;
                elements.messageEl.textContent = 'Push! Bet returned.';
                break;
            case 'surrender':
                elements.messageEl.textContent = 'You surrendered! Half bet returned.';
                break;
        }
        
        updateStats();
        setTimeout(() => {
            resetGame();
        }, 2500);
    }

    function resetGame() {
        gameState.bet = 0;
        gameState.playerHand = [];
        gameState.dealerHand = [];
        gameState.gameOver = true;
        gameState.canDoubleDown = true;
        
        updateBetDisplay();
        updateButtonStates();
        renderGameState();
        elements.messageEl.textContent = 'Place your bet to play again!';
    }

    function addToHistory(result, amount) {
        const historyContainer = document.getElementById('history-container');
        if (historyContainer) {
            const entry = document.createElement('div');
            entry.className = `history-entry ${result}`;
            entry.textContent = `${player.name} ${result} $${amount}`;
            historyContainer.insertBefore(entry, historyContainer.firstChild);
        }
    }

    // Add keyboard event listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'h' && !elements.hitButton.disabled) window.hit();
        if (e.key === 's' && !elements.standButton.disabled) window.stand();
        if (e.key === 'd' && !elements.doubleButton.disabled) window.doubleDown();
        if (e.key === 'u' && surrenderButton && !surrenderButton.disabled) window.surrender();
    });

    // Initialize the game
    resetGame();
});