import type { Finish, Scores } from './types'

export const MIN_CARD = 2
export const MAX_CARD = 14

export function scoreRange(finish: Finish): { min: number; max: number } {
  return { min: MIN_CARD * finish, max: MAX_CARD * finish }
}

export function isValidScore(score: number, finish: Finish): boolean {
  const { min, max } = scoreRange(finish)
  return Number.isInteger(score) && score >= min && score <= max
}

function scoreOf(scores: Scores, id: string): number {
  const s = scores[id]
  if (s === undefined) throw new Error(`Missing score for player ${id}`)
  return s
}

/** Players sharing the lowest and the highest score, in seat order. */
export function extremes(seats: string[], scores: Scores): { lowest: string[]; highest: string[] } {
  const values = seats.map((id) => scoreOf(scores, id))
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return {
    lowest: seats.filter((id) => scores[id] === lo),
    highest: seats.filter((id) => scores[id] === hi),
  }
}

/** True when the winner or loser cannot be decided without knowing who led the last trick. */
export function needsLastTrickLeader(seats: string[], scores: Scores): boolean {
  const { lowest, highest } = extremes(seats, scores)
  return lowest.length > 1 || highest.length > 1
}

/**
 * Clockwise distance from the leader of the last trick. The leader is 0, the
 * player to their left 1, and the player to their right is the furthest away.
 * It is never the shortest way around the table.
 */
export function clockwiseDistance(seats: string[], leaderId: string, playerId: string): number {
  const leader = seats.indexOf(leaderId)
  const player = seats.indexOf(playerId)
  if (leader < 0 || player < 0) throw new Error('Player is not seated in this round')
  return (player - leader + seats.length) % seats.length
}

export type Outcome = { winnerId: string; loserId: string }

/**
 * Decides the single winner and loser of a round. Returns null when there is a
 * tie and lastTrickLeaderId is needed but missing.
 */
export function resolveRound(seats: string[], scores: Scores, lastTrickLeaderId?: string): Outcome | null {
  if (seats.length < 2) throw new Error('A round needs at least two players')
  const { lowest, highest } = extremes(seats, scores)
  if (lowest.length === 1 && highest.length === 1) {
    return { winnerId: lowest[0]!, loserId: highest[0]! }
  }
  if (!lastTrickLeaderId) return null
  const dist = (id: string) => clockwiseDistance(seats, lastTrickLeaderId, id)
  const winnerId = lowest.reduce((best, id) => (dist(id) < dist(best) ? id : best))
  const loserId = highest.reduce((worst, id) => (dist(id) > dist(worst) ? id : worst))
  return { winnerId, loserId }
}
