import { firstDeal, maxDeal, nextDeal } from './deal'
import { balances } from './ledger'
import type { Session } from './types'

/** Number of cards the deal rule suggests for the next round. */
export function suggestedDeal(session: Session): number {
  const n = session.seats.length
  const last = session.rounds.at(-1)
  if (!last) return firstDeal(session.config.startCards, n)
  return nextDeal(session.config.dealRule, n, last.scores[last.winnerId]!, last.scores[last.loserId]!)
}

/** The suggested deal, or the manual override when one is set. */
export function currentDeal(session: Session): number {
  const cards = session.dealOverride ?? suggestedDeal(session)
  return Math.min(Math.max(cards, 1), maxDeal(session.seats.length))
}

export type PlayerTotals = {
  rounds: number
  wins: number
  losses: number
  /** Average final card over single-card rounds, or null when there are none. */
  average: number | null
  balance: number
}

export function sessionTotals(session: Session): Record<string, PlayerTotals> {
  const bal = balances(session.rounds, session.players.map((p) => p.id))
  const out: Record<string, PlayerTotals> = {}
  for (const id of Object.keys(bal)) {
    const played = session.rounds.filter((r) => r.seats.includes(id))
    const singles = played.filter((r) => r.finish === 1)
    out[id] = {
      rounds: played.length,
      wins: played.filter((r) => r.winnerId === id).length,
      losses: played.filter((r) => r.loserId === id).length,
      average: singles.length ? singles.reduce((s, r) => s + r.scores[id]!, 0) / singles.length : null,
      balance: bal[id]!,
    }
  }
  return out
}
