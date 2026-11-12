import { Link } from 'react-router-dom'
import { useStore } from '../../data/store'
import { sessionTotals } from '../../domain/session'
import type { Player, Session } from '../../domain/types'
import { useT } from '../../i18n'
import { fmtSigned, peopleOf } from '../format'

export function SessionList({ sessions, players }: { sessions: Session[]; players: Player[] }) {
  const t = useT()
  return (
    <ul className="divide-y divide-line rounded-xl bg-surface">
      {sessions.map((s) => {
        const person = peopleOf(s, players)
        const totals = sessionTotals(s)
        const best = Object.entries(totals).sort((a, b) => b[1].balance - a[1].balance)[0]
        const rounds = s.rounds.length
        return (
          <li key={s.id}>
            <Link to={`/session/${s.id}`} className="block px-3 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{s.name}</span>
                <span className="text-sm text-muted">
                  {t.common.rounds(rounds)}
                  {!s.endedAt && ` · ${t.history.inProgress}`}
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3 text-sm text-muted">
                <span className="truncate">{s.players.map((p) => person(p.id).name).join(', ')}</span>
                {best && best[1].balance > 0 && (
                  <span className="shrink-0">
                    {person(best[0]).name} <span className="tabular text-good">{fmtSigned(best[1].balance)}</span>
                  </span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function HistoryPage() {
  const sessions = useStore((s) => s.sessions)
  const players = useStore((s) => s.players)
  const t = useT()
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt)
  return (
    <section>
      <h1 className="text-2xl font-bold">{t.history.title}</h1>
      {sorted.length === 0 ? (
        <p className="mt-2 text-muted">{t.history.none}</p>
      ) : (
        <div className="mt-4">
          <SessionList sessions={sorted} players={players} />
        </div>
      )}
    </section>
  )
}
