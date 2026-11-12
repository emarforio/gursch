import type { FormulaProblem } from '../domain/formula'
import type { Player, Session, SessionPlayer } from '../domain/types'
import { locale } from '../i18n'
import type { Dictionary } from '../i18n'

// Numbers and dates follow the app's language, not the browser default.

function fmtNumber(n: number, minDigits: number, maxDigits: number): string {
  const text = new Intl.NumberFormat(locale(), {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
    useGrouping: false,
  }).format(n)
  return text.replace('-', '−')
}

/** Money without trailing zeros: 12, 0.48, −3.5 */
export function fmtMoney(n: number): string {
  // Adding 0 turns a rounded −0 into 0.
  return fmtNumber(Math.round(n * 100) / 100 + 0, 0, 2)
}

export function fmtSigned(n: number): string {
  return (n > 0 ? '+' : '') + fmtMoney(n)
}

/** A number with exactly one decimal, or a dash when there is none. */
export function fmtAverage(n: number | null): string {
  return n === null ? '–' : fmtNumber(n, 1, 1)
}

/** A share as a whole percentage, or a dash when there is nothing to take a share of. */
export function fmtPercent(part: number, whole: number): string {
  return whole ? new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 0 }).format(part / whole) : '–'
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })
}

/** The sentence for a formula problem reported by the domain layer. */
export function formulaProblem(t: Dictionary, problem: FormulaProblem): string {
  return 'token' in problem ? t.formula[problem.code](problem.token) : t.formula[problem.code]
}

/** Looks up a session's players by id, preferring current names and pictures over the snapshot. */
export function peopleOf(session: Session, players: Player[]): (id: string) => SessionPlayer {
  const live = new Map(players.map((p) => [p.id, p]))
  const snap = new Map(session.players.map((p) => [p.id, p]))
  return (id) => live.get(id) ?? snap.get(id) ?? { id, name: '?' }
}
