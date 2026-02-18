(function bootstrapCore(globalScope, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
        return;
    }

    globalScope.BlackjackCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore() {
    const BLACKJACK_TOTAL = 21;
    const DEALER_STAND_TOTAL = 17;
    const SUITS = ["♠", "♥", "♦", "♣"];
    const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    function getCardNumericValue(rank) {
        if (rank === "A") return 11;
        if (["K", "Q", "J"].includes(rank)) return 10;
        return Number(rank);
    }

    function getSplitValue(rank) {
        if (rank === "A") return 11;
        if (["10", "J", "Q", "K"].includes(rank)) return 10;
        return Number(rank);
    }

    function getHandValue(cards) {
        let total = 0;
        let aces = 0;

        cards.forEach((card) => {
            if (card.rank === "A") {
                aces += 1;
                total += 1;
            } else {
                total += getCardNumericValue(card.rank);
            }
        });

        let softAcesUsed = 0;
        while (aces > 0 && total + 10 <= BLACKJACK_TOTAL) {
            total += 10;
            aces -= 1;
            softAcesUsed += 1;
        }

        return {
            total,
            isSoft: softAcesUsed > 0,
            isBust: total > BLACKJACK_TOTAL,
            isBlackjack: cards.length === 2 && total === BLACKJACK_TOTAL
        };
    }

    function createShoe(decks) {
        const totalDecks = Number.isInteger(decks) && decks > 0 ? decks : 6;
        const cards = [];

        for (let deck = 0; deck < totalDecks; deck += 1) {
            SUITS.forEach((suit) => {
                RANKS.forEach((rank) => {
                    cards.push({ suit, rank });
                });
            });
        }

        return cards;
    }

    function hashSeed(seedValue) {
        const seed = String(seedValue ?? "");
        let hash = 2166136261;
        for (let i = 0; i < seed.length; i += 1) {
            hash ^= seed.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function createSeededRng(seedValue) {
        let state = hashSeed(seedValue) || 1;
        return function seededRandom() {
            state += 0x6d2b79f5;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffle(cards, rng = Math.random) {
        const shuffled = [...cards];
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    function drawCard(shoe) {
        if (!Array.isArray(shoe) || shoe.length === 0) {
            return null;
        }

        const card = shoe.pop();
        return card ? { ...card } : null;
    }

    function createSeededShoe(seedValue, decks = 6) {
        const shoe = createShoe(decks);
        const rng = createSeededRng(seedValue);
        return shuffle(shoe, rng);
    }

    function resolveHandOutcome(playerCards, dealerCards, options = {}) {
        const { splitOrigin = false, surrendered = false } = options;
        if (surrendered) {
            return "surrender";
        }

        const playerValue = getHandValue(playerCards);
        const dealerValue = getHandValue(dealerCards);

        if (playerValue.isBust) return "bust";
        if (dealerValue.isBust) {
            return playerValue.isBlackjack && !splitOrigin ? "blackjack" : "win";
        }

        if (dealerValue.total > playerValue.total) return "lose";
        if (dealerValue.total < playerValue.total) {
            return playerValue.isBlackjack && !splitOrigin ? "blackjack" : "win";
        }

        return "push";
    }

    return {
        BLACKJACK_TOTAL,
        DEALER_STAND_TOTAL,
        SUITS,
        RANKS,
        getCardNumericValue,
        getSplitValue,
        getHandValue,
        createShoe,
        createSeededRng,
        createSeededShoe,
        shuffle,
        drawCard,
        resolveHandOutcome
    };
});
