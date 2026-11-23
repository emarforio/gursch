import { allInHand, valueOf, without } from './cards'
import type { Card } from './cards'

/**
 * One trick. Play goes clockwise from the starter. A player who has put in
 * fewer cards than the trick requires plays again when the turn comes back,
 * so a set played late in the trick sends the turn round once more.
 */
export type Trick = {
  starterId: string
  /** Every card each player has put into this trick, in the order played. */
  plays: Record<string, Card[]>
  /** Cards each player must put in: the size of the largest set played. 0 before the first play. */
  required: number
  /** The value to match or beat. 0 before the first play. */
  bar: number
  /** Who would win the trick if it ended now: the last player to match or beat the bar. */
  holderId: string
  /** Players who failed to match or beat the bar. They cannot win this trick. */
  out: string[]
  /** Whose turn it is, or null when the trick is complete. */
  turnId: string | null
}

export type PlayProblem = 'notYourTurn' | 'notInHand' | 'notASet' | 'wrongCount' | 'tooFew' | 'tooMany' | 'setTooLow' | 'between'

export function startTrick(seats: string[], starterId: string): Trick {
  return {
    starterId,
    plays: Object.fromEntries(seats.map((id) => [id, []])),
    required: 0,
    bar: 0,
    holderId: starterId,
    out: [],
    turnId: starterId,
  }
}

const sameValue = (cards: readonly Card[]) => cards.every((c) => valueOf(c) === valueOf(cards[0]!))

/**
 * Cards below the bar are only allowed when they are the lowest in the hand:
 * no card kept back may be lower than any of them.
 */
function lowestRuleHolds(hand: readonly Card[], cards: readonly Card[], bar: number): boolean {
  const low = cards.filter((c) => valueOf(c) < bar)
  if (low.length === 0) return true
  const kept = without(hand, cards)
  if (kept.length === 0) return true
  return Math.max(...low.map(valueOf)) <= Math.min(...kept.map(valueOf))
}

/** How many cards this player has to play now. For a regular turn more is allowed with a set. */
export function cardsToPlay(trick: Trick, playerId: string): number {
  if (trick.required === 0) return 1
  return trick.required - (trick.plays[playerId]?.length ?? 0)
}

/** Why the play is not allowed, or null when it is. */
export function checkPlay(trick: Trick, playerId: string, hand: readonly Card[], cards: readonly Card[]): PlayProblem | null {
  if (trick.turnId !== playerId) return 'notYourTurn'
  if (cards.length === 0 || !allInHand(hand, cards)) return 'notInHand'

  // Starting the trick: one card or a set of the same value.
  if (trick.required === 0) return sameValue(cards) ? null : 'notASet'

  const played = trick.plays[playerId]?.length ?? 0
  const short = trick.required - played

  if (played === 0 && cards.length > short) {
    // A larger set raises the number of cards for everyone, but only if it matches or beats the bar.
    if (!sameValue(cards)) return 'notASet'
    return valueOf(cards[0]!) >= trick.bar ? null : 'setTooLow'
  }
  if (cards.length < short) return 'tooFew'
  if (cards.length > short) return 'tooMany'
  return lowestRuleHolds(hand, cards, trick.bar) ? null : 'between'
}

/** The trick after a play that checkPlay allowed. */
export function applyPlay(trick: Trick, seats: string[], playerId: string, cards: readonly Card[]): Trick {
  const next: Trick = { ...trick, plays: { ...trick.plays }, out: [...trick.out] }
  const played = trick.plays[playerId] ?? []
  const values = cards.map(valueOf)
  const beats = values.every((v) => v >= trick.bar)

  if (trick.required === 0) {
    next.required = cards.length
    next.bar = values[0]!
    next.holderId = playerId
  } else if (played.length === 0) {
    if (!beats) {
      next.out.push(playerId)
    } else {
      // Only a set raises the bar. Matching it with mixed cards still takes the lead, as the last to match.
      if (sameValue(cards)) {
        next.bar = values[0]!
        next.required = Math.max(trick.required, cards.length)
      }
      next.holderId = playerId
    }
  } else if (!trick.out.includes(playerId)) {
    // Topping up: each card only has to match or beat one card of the set on the table.
    if (beats) {
      next.bar = Math.min(...values)
      next.holderId = playerId
    } else {
      next.out.push(playerId)
    }
  }

  next.plays[playerId] = [...played, ...cards]
  next.turnId = nextTurn(next, seats, playerId)
  return next
}

/** The next player clockwise who is still short of cards, or null when everyone has played enough. */
function nextTurn(trick: Trick, seats: string[], fromId: string): string | null {
  const from = seats.indexOf(fromId)
  for (let i = 1; i <= seats.length; i++) {
    const id = seats[(from + i) % seats.length]!
    if ((trick.plays[id]?.length ?? 0) < trick.required) return id
  }
  return null
}
