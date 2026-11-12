import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { firebaseConfigured } from '../../data/config'
import { currentDeal } from '../../domain/session'
import { computeStats } from '../../domain/stats'
import type { Session } from '../../domain/types'
import { useT } from '../../i18n'
import { LineChart, seriesColor } from '../components/Charts'
import { ScoreTable } from '../components/ScoreTable'
import { SettleUp } from '../components/SettleUp'
import { fmtMoney, peopleOf } from '../format'

type State = { status: 'loading' } | { status: 'missing' } | { status: 'error' } | { status: 'ok'; session: Session }

/** Read-only live view of a shared session, for people following along. No sign-in needed. */
export function SharedPage() {
  const { id } = useParams()
  const t = useT()
  const [state, setState] = useState<State>({ status: firebaseConfigured ? 'loading' : 'missing' })

  useEffect(() => {
    if (!firebaseConfigured || !id) return
    let cancelled = false
    let stop = () => {}
    setState({ status: 'loading' })
    import('../../data/firebase')
      .then((fb) => {
        if (cancelled) return
        stop = fb.watchSession(
          id,
          (session) => setState(session ? { status: 'ok', session } : { status: 'missing' }),
          () => setState({ status: 'error' }),
        )
      })
      .catch(() => setState({ status: 'error' }))
    return () => {
      cancelled = true
      stop()
    }
  }, [id])

  if (state.status === 'loading') return (
      <p className="text-muted" role="status">
        {t.shared.loading}
      </p>
    )
  if (state.status === 'error') {
    return (
      <section>
        <h1 className="text-2xl font-bold">{t.shared.errorTitle}</h1>
        <p className="mt-2 text-muted">{t.shared.errorNote}</p>
      </section>
    )
  }
  if (state.status === 'missing') {
    return (
      <section>
        <h1 className="text-2xl font-bold">{t.shared.missingTitle}</h1>
        <p className="mt-2 text-muted">{t.shared.missingNote}</p>
      </section>
    )
  }

  const { session } = state
  const person = peopleOf(session, [])
  const rounds = session.rounds.length
  const last = session.rounds.at(-1)
  const ended = session.endedAt !== undefined
  const stats = computeStats([session])
  const order = session.players.map((p) => p.id)

  return (
    <section>
      <h1 className="text-2xl font-bold">{session.name}</h1>
      <p className="mt-1 text-muted">
        {t.shared.played(rounds)} · {ended ? t.common.ended : t.shared.live}
      </p>

      {!ended && (
        <p className="mt-4 rounded-xl bg-surface px-3 py-2.5">
          {t.game.round(rounds + 1)}: <span className="font-semibold">{t.common.cards(currentDeal(session))}</span> {t.shared.each}
        </p>
      )}
      {last && (
        <p className="mt-2 rounded-xl bg-surface px-3 py-2.5">
          {t.shared.lastRound} <span className="font-semibold">{person(last.loserId).name}</span> {t.common.owes}{' '}
          <span className="font-semibold">{person(last.winnerId).name}</span>{' '}
          <span className="tabular font-bold">{fmtMoney(last.amount)}</span>
        </p>
      )}

      <h2 className="mt-6 mb-2 font-semibold">{t.common.scores}</h2>
      <ScoreTable session={session} person={person} />

      {rounds > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-semibold">{t.common.moneyOverTime}</h2>
          <div className="rounded-xl bg-surface p-3">
            <LineChart
              series={stats.timeline.ids.map((pid) => {
                let value = 0
                return {
                  id: pid,
                  name: person(pid).name,
                  color: seriesColor(order.indexOf(pid)),
                  values: [0, ...stats.timeline.points.map((p) => (value = p[pid] ?? value))],
                }
              })}
            />
          </div>

          <h2 className="mt-6 mb-2 font-semibold">{t.common.settleUp}</h2>
          <SettleUp session={session} person={person} />
        </>
      )}
    </section>
  )
}
