import type { DealRule } from './types'

export const DECK_SIZE = 52

export function maxDeal(playerCount: number): number {
  return Math.floor(DECK_SIZE / playerCount)
}

/** Largest deal the rule allows for this many players, never below 1. */
export function dealCap(rule: DealRule, playerCount: number): number {
  return Math.max(1, maxDeal(playerCount) - rule.capBelowMax)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Suggested number of cards for the next round, from the previous round's result. */
export function nextDeal(rule: DealRule, playerCount: number, winnerScore: number, loserScore: number): number {
  const cap = dealCap(rule, playerCount)
  const raw =
    rule.mode === 'fixed' ? (rule.fixed ?? cap) : rule.mode === 'loserScore' ? loserScore : loserScore - winnerScore
  return clamp(raw, 1, cap)
}

/** Deal for the first round, limited by what the deck allows. */
export function firstDeal(startCards: number, playerCount: number): number {
  return clamp(startCards, 1, maxDeal(playerCount))
}

export type DealHint = 'oneCard' | 'twoCards'

/** Which reminder to show for the small deals that have special rules. The UI holds the wording. */
export function dealHint(cards: number): DealHint | null {
  if (cards === 1) return 'oneCard'
  if (cards === 2) return 'twoCards'
  return null
}
