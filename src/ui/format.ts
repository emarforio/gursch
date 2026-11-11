import type { Player, Session, SessionPlayer } from '../domain/types'

/** Money without trailing zeros: 12, 0.48, -3.5 */
export function fmtMoney(n: number): string {
  return String(Math.round(n * 100) / 100).replace('-', '−')
}

export function fmtSigned(n: number): string {
  return (n > 0 ? '+' : '') + fmtMoney(n)
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtAverage(n: number | null): string {
  return n === null ? '–' : n.toFixed(1)
}

/** Looks up a session's players by id, preferring current names and pictures over the snapshot. */
export function peopleOf(session: Session, players: Player[]): (id: string) => SessionPlayer {
  const live = new Map(players.map((p) => [p.id, p]))
  const snap = new Map(session.players.map((p) => [p.id, p]))
  return (id) => live.get(id) ?? snap.get(id) ?? { id, name: '?' }
}
