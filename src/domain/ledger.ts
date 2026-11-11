import { evaluateFormula } from './formula'
import type { Round, Scores } from './types'

/** What the loser owes the winner for one round. */
export function roundAmount(formula: string, seats: string[], scores: Scores, winnerId: string, loserId: string): number {
  return evaluateFormula(formula, {
    max_score: scores[loserId]!,
    min_score: scores[winnerId]!,
    total: seats.reduce((sum, id) => sum + scores[id]!, 0),
    players: seats.length,
  })
}

/** Net money per player: positive is owed to them, negative is what they owe. */
export function balances(rounds: Round[], playerIds: string[] = []): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of playerIds) out[id] = 0
  for (const r of rounds) {
    for (const id of r.seats) out[id] ??= 0
    out[r.winnerId] = (out[r.winnerId] ?? 0) + r.amount
    out[r.loserId] = (out[r.loserId] ?? 0) - r.amount
  }
  return out
}

export type Transfer = { from: string; to: string; amount: number }

const cents = (n: number) => Math.round(n * 100)

/** Payments that settle all balances, pairing the largest debtor with the largest creditor. */
export function settleUp(bal: Record<string, number>): Transfer[] {
  const debtors = Object.entries(bal)
    .filter(([, v]) => cents(v) < 0)
    .map(([id, v]) => ({ id, left: -cents(v) }))
  const creditors = Object.entries(bal)
    .filter(([, v]) => cents(v) > 0)
    .map(([id, v]) => ({ id, left: cents(v) }))
  const transfers: Transfer[] = []
  for (;;) {
    debtors.sort((a, b) => b.left - a.left)
    creditors.sort((a, b) => b.left - a.left)
    const d = debtors[0]
    const c = creditors[0]
    if (!d || !c || d.left === 0 || c.left === 0) break
    const pay = Math.min(d.left, c.left)
    transfers.push({ from: d.id, to: c.id, amount: pay / 100 })
    d.left -= pay
    c.left -= pay
  }
  return transfers
}
