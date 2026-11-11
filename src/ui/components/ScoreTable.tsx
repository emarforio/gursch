import { cardLabel } from '../../domain/scoring'
import { sessionTotals } from '../../domain/session'
import { FINISH_NAMES } from '../../domain/types'
import type { Session, SessionPlayer } from '../../domain/types'
import { fmtAverage, fmtMoney, fmtSigned } from '../format'

type Props = { session: Session; person: (id: string) => SessionPlayer; onPickRound?: (roundId: string) => void }

export function ScoreTable({ session, person, onPickRound }: Props) {
  const ids = session.players.map((p) => p.id).sort((a, b) => seatRank(session, a) - seatRank(session, b))
  const totals = sessionTotals(session)
  const rounds = session.rounds.map((r, i) => ({ r, n: i + 1 })).reverse()
  const cell = 'px-2 py-1.5 text-center tabular'

  return (
    <div className="overflow-x-auto rounded-xl bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="px-2 py-2 text-left font-medium">#</th>
            {ids.map((id) => (
              <th key={id} className="max-w-20 truncate px-2 py-2 font-semibold text-text">
                {person(id).name}
              </th>
            ))}
            <th className="px-2 py-2 text-right font-medium">Owed</th>
          </tr>
        </thead>
        <tbody>
          <SummaryRow label="Balance" ids={ids} value={(id) => fmtSigned(totals[id]!.balance)} strong tone={(id) => totals[id]!.balance} />
          <SummaryRow label="Wins" ids={ids} value={(id) => String(totals[id]!.wins)} />
          <SummaryRow label="Losses" ids={ids} value={(id) => String(totals[id]!.losses)} />
          <SummaryRow label="Average" ids={ids} value={(id) => fmtAverage(totals[id]!.average)} last />
          {rounds.map(({ r, n }) => (
            <tr
              key={r.id}
              className={`border-t border-line ${onPickRound ? 'cursor-pointer active:bg-sunken' : ''}`}
              onClick={onPickRound && (() => onPickRound(r.id))}
            >
              <td className="px-2 py-1.5 text-left text-muted tabular">
                {n}
                {r.finish > 1 && <span className="ml-1 text-xs">{FINISH_NAMES[r.finish]}</span>}
              </td>
              {ids.map((id) => {
                const s = r.scores[id]
                const tone = id === r.winnerId ? 'font-bold text-good' : id === r.loserId ? 'font-bold text-bad' : ''
                return (
                  <td key={id} className={`${cell} ${tone}`}>
                    {s === undefined ? '' : r.finish === 1 ? cardLabel(s) : s}
                  </td>
                )
              })}
              <td className="px-2 py-1.5 text-right tabular">{fmtMoney(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rounds.length === 0 && <p className="px-3 py-4 text-sm text-muted">No rounds played yet.</p>}
      {rounds.length > 0 && onPickRound && (
        <p className="border-t border-line px-3 py-2 text-xs text-muted">Tap a round to change or delete it.</p>
      )}
    </div>
  )
}

function seatRank(session: Session, id: string): number {
  const i = session.seats.indexOf(id)
  return i < 0 ? Number.MAX_SAFE_INTEGER : i
}

function SummaryRow(props: {
  label: string
  ids: string[]
  value: (id: string) => string
  strong?: boolean
  last?: boolean
  tone?: (id: string) => number
}) {
  return (
    <tr className={`bg-sunken/50 ${props.last ? '' : ''}`}>
      <td className="px-2 py-1 text-left text-xs text-muted">{props.label}</td>
      {props.ids.map((id) => {
        const t = props.tone?.(id) ?? 0
        const colour = t > 0 ? 'text-good' : t < 0 ? 'text-bad' : ''
        return (
          <td key={id} className={`px-2 py-1 text-center tabular ${props.strong ? 'font-semibold' : 'text-muted'} ${colour}`}>
            {props.value(id)}
          </td>
        )
      })}
      <td />
    </tr>
  )
}
