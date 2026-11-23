/**
 * Playing cards. A card is a number from 0 to 51: suit * 13 + (value - 2).
 * Only the value matters in Gursch; the suit is kept so cards can be told apart and drawn.
 */
export type Card = number

export const DECK: readonly Card[] = Array.from({ length: 52 }, (_, i) => i)

/** 2 to 14, where 11 is a jack and 14 an ace. */
export function valueOf(card: Card): number {
  return (card % 13) + 2
}

/** 0 spades, 1 hearts, 2 diamonds, 3 clubs. */
export function suitOf(card: Card): 0 | 1 | 2 | 3 {
  return Math.floor(card / 13) as 0 | 1 | 2 | 3
}

/** Fisher–Yates shuffle into a new array. `random` returns a number in [0, 1). */
export function shuffle(cards: readonly Card[], random: () => number): Card[] {
  const out = [...cards]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** Lowest value first, suits in a fixed order within a value. */
export function sortCards(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => valueOf(a) - valueOf(b) || suitOf(a) - suitOf(b))
}

/** A hand with only cards of value 2–10 may be thrown before the first trade. */
export function isWeakHand(hand: readonly Card[]): boolean {
  return hand.length > 0 && hand.every((c) => valueOf(c) <= 10)
}

/** The cards in `from` that are not in `remove`. */
export function without(from: readonly Card[], remove: readonly Card[]): Card[] {
  const gone = new Set(remove)
  return from.filter((c) => !gone.has(c))
}

/** True when every card is distinct and in the hand. */
export function allInHand(hand: readonly Card[], cards: readonly Card[]): boolean {
  const held = new Set(hand)
  return new Set(cards).size === cards.length && cards.every((c) => held.has(c))
}
