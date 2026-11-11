# Gursch — house rules

Gursch (also Gurch, Gurka) is a short trick-based card game. One round is a single deal. After each round every player gets a score, and one player wins and one player loses the round. You can play any number of rounds in a session.
## Basics

- **Deck:** a standard 52-card deck, no jokers.
- **Card values:** only the value matters, suits are ignored. 2 is lowest, then 3–10, jack (11), queen (12), king (13) and ace (14) is highest.
- **Goal:** finish the round holding as low a card as possible. The player who plays the lowest card in the last trick wins the round, and the player who plays the highest card loses it.
- **Our names for sets:** a pair is a **doffel** (plural dofflar), three of a kind is a **troffel** (trofflar), four of a kind is a **foffel** (fofflar).

## Dealing

1. Everyone gets the same number of cards. The first round is normally 6 cards each.
2. The largest possible deal is 52 divided by the number of players, rounded down. With 5 players that is 10 cards each, with 2 cards left over.
3. From the second round on, the number of cards depends on the previous round. This is configurable; the two rules we use are:
   - **Loser's score:** deal as many cards as the previous loser's score.
   - **Difference:** deal the difference between the previous loser's and winner's scores, capped at one less than the largest possible deal so some fresh cards are left to trade with.
4. The last card to each player is dealt **face up**, so everyone sees one card of every other player.

### Small deals

- **1 card each:** the card is dealt face down and no trade is allowed. To decide the leader, everyone is then dealt one extra card face up. The highest extra card makes its holder the leader, with ties broken as usual. The extra cards are discarded and only the face-down card is kept.
- **2 cards each:** dealt as normal (last card face up), but the first trade is skipped. An open trade can still be made.

## The leader

The player with the highest face-up card is the **leader** for the round. The leader decides the first trade and plays first.

If two or more players tie for the highest face-up card, each of them is dealt one extra card and the highest extra card decides the leader. The extra cards are not part of the game and go straight to the discard pile.

## Trading

"Trading" always means discarding cards and drawing new ones from the deck. Players never trade with each other.

### Throwing a weak hand (before the first trade)

A player whose hand contains only cards of value 2–10 may throw away the whole hand and get a new one. They must call it and show the hand to the others **before** the leader has announced how many cards to trade. They get their new cards straight away and still have to take part in the first trade afterwards.

### First trade (forced)

1. Everyone looks at their cards.
2. The leader decides how many cards are traded: none, all, or anything in between.
3. **Everyone must trade exactly that many cards**, whether they want to or not.
4. Everyone first discards that many cards into the discard pile.
5. New cards are then dealt one player at a time, starting with the leader and going clockwise.
6. If the fresh cards run out, the discard pile is shuffled and used.

### Open trade (optional)

After the first trade, any player may suggest an open trade of any number of cards. It differs from the first trade in three ways:

1. **Everyone must agree.** If anyone refuses, nobody trades.
2. The new cards are dealt **face up** to everyone before anyone discards.
3. Each player then chooses how many of their face-up cards to take: all, some, or none. For each card taken, one card is discarded from the hand.

## Playing tricks

The leader starts the first trick. Play goes clockwise and each trick is exactly one lap.

### Following a single card

On your turn you must play either:

- **any card with the same or a higher value** than the highest card played so far in the trick, or
- **your absolute lowest card.**

You may not play a card in between. If an ace has been played, only another ace beats it; otherwise you must play your lowest card.

### Winning a trick

The player who played the highest card wins the trick. If several players played the same highest value, **the last one to play it wins.** The trick winner starts the next trick.

A player who failed to beat the bar earlier in the same trick has lost that trick and cannot win it later, even if they play a higher card afterwards.

### Playing several cards (dofflar, trofflar, fofflar)

- Whoever starts a trick may start with several cards, as long as they all have the same value.
- The players after them must then play that many cards, and each card is judged on its own: every card must either match or beat the bar, or be the lowest card in the hand. You may beat one card and not the other, for example a jack and a 4 against two sixes.
- **Only a set raises the bar.** Beating a doffel with two different cards (jack and 4) does not change what the next player has to beat. To raise the bar you must play a doffel (or troffel, foffel) of equal or higher value.
- **A set may be played on a single card.** This raises both the bar and the number of cards for the trick.
- **Everyone must have the same number of cards after each trick.** A player who played fewer cards than the trick ended up requiring plays again when the turn comes back to them, adding only as many cards as they are short. Such a top-up card only needs to beat one card of the set on the table.

**Example 1** — players A, B, C in order:

1. A plays a single 8.
2. B plays two 10s.
3. C plays a jack and a 3. The jack beats one 10, the 3 does not, so C is out of the trick.
4. A is one card short and plays again. A plays a 10. It matches the bar, and the last card of the same value wins, so A wins the trick.

**Example 2:**

1. A plays a single 8.
2. B plays a 3. B is out of the trick.
3. C plays two 9s, raising the bar.
4. A plays a 10, raising the bar again.
5. B must play a second card but cannot win the trick whatever they play, so B plays a 4.

## Ending the round

The round ends with the last trick.

- **Score:** each player's score is the value of the card they played in the last trick (2–14).
- **Winner:** the lowest score. **Loser:** the highest score. There is always exactly one winner and one loser.
- **Ties:** if several players share the lowest or the highest score, the one sitting closest to the player who led the last trick (the winner of the trick before) comes out better. Among tied low scores the closest one wins. Among tied high scores the one furthest away loses.
- **Closeness is counted clockwise only**, starting from the player who led the last trick, who is the closest of all. It is not the shortest way around the table: the player sitting just to the leader's right is the furthest away, not the second closest.

### Doffel, troffel and foffel finishes

A trick in which a doffel is played uses up two cards from everyone. If that empties everyone's hand, it was the last trick, and everyone has finished on two cards. Each player's score is the sum of their two cards (4–28).

It does not matter how the doffel came into the trick. The trick may have been started with a doffel, or started with a single card on which someone later played a doffel. It is still one trick, and if it uses up all the cards it is the last one.

The same goes for a troffel when everyone has three cards left (scores 6–42) and a foffel when everyone has four cards left (scores 8–56). These finishes are rare.

## Between rounds

The scores are noted, the deck is shuffled, and a new round is dealt according to the dealing rule. A new leader is decided by the face-up cards.

## Money

Each round the loser owes the winner an amount given by a formula over that round's scores. Our standard formula is:

```
(max_score - min_score) * 2
```

where `max_score` is the loser's score and `min_score` is the winner's score. Sometimes we use other formulas, such as `max_score^2` or `(max_score * min_score) / 100`. The formula can change during a session; debts are kept as a running tab and settled at the end.
