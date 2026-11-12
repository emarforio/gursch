import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { newId, useStore } from '../../data/store'
import { dealHint, maxDeal } from '../../domain/deal'
import { currentDeal, suggestedDeal } from '../../domain/session'
import type { Round, Session } from '../../domain/types'
import { useT } from '../../i18n'
import { Stepper } from '../components/Controls'
import { RoundEntry } from '../components/RoundEntry'
import type { RoundResult } from '../components/RoundEntry'
import { ScoreTable } from '../components/ScoreTable'
import { peopleOf } from '../format'
import { useWakeLock } from '../wakeLock'

export function GamePage({ session }: { session: Session }) {
  const players = useStore((s) => s.players)
  const repo = useStore((s) => s.repo)
  const navigate = useNavigate()
  const t = useT()
  const person = peopleOf(session, players)
  const seats = session.seats
  const cards = currentDeal(session)
  const suggested = suggestedDeal(session)
  const hint = dealHint(cards)
  // The session as it was before the round just saved here, so that round can be undone.
  const [beforeSave, setBeforeSave] = useState<Session | null>(null)
  const last = session.rounds.at(-1)
  const canUndo = beforeSave !== null && last !== undefined && beforeSave.rounds.length === session.rounds.length - 1

  useWakeLock(true)

  function save(result: RoundResult) {
    const round: Round = {
      id: newId(),
      at: Date.now(),
      seats,
      cardsDealt: cards,
      formula: session.config.formula,
      ...result,
    }
    const { dealOverride: _used, ...rest } = session
    repo.saveSession({ ...rest, rounds: [...session.rounds, round] })
    setBeforeSave(session)
  }

  function undo() {
    if (!canUndo) return
    // Takes the round away again and brings back a manual deal that was set for it.
    const { dealOverride: _now, ...rest } = session
    repo.saveSession({
      ...rest,
      rounds: session.rounds.slice(0, -1),
      ...(beforeSave.dealOverride === undefined ? {} : { dealOverride: beforeSave.dealOverride }),
    })
    setBeforeSave(null)
  }

  function setDeal(v: number) {
    const { dealOverride: _old, ...rest } = session
    repo.saveSession(v === suggested ? rest : { ...rest, dealOverride: v })
  }

  const link = 'flex h-9 items-center rounded-lg bg-sunken px-3 text-sm font-medium'

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t.game.round(session.rounds.length + 1)}</h1>
          <p className="text-sm text-muted">
            {t.game.deal(cards)}
            {cards !== suggested && ` ${t.game.ruleSays(suggested)}`}
          </p>
        </div>
        <Stepper label={t.game.cardsToDeal} value={cards} min={1} max={maxDeal(seats.length)} onChange={setDeal} />
      </div>
      {hint && <p className="mt-2 rounded-lg bg-sunken px-3 py-2 text-sm">{t.game.hints[hint]}</p>}

      <div className="mt-4">
        <RoundEntry
          key={`${session.rounds.length}:${seats.join()}`}
          seats={seats}
          person={person}
          formula={session.config.formula}
          cards={cards}
          onSave={save}
        />
      </div>

      {canUndo && (
        <p className="mt-3 flex items-center justify-between gap-3 text-sm text-muted" role="status">
          {t.game.saved(session.rounds.length)}
          <button type="button" onClick={undo} className="-my-2 rounded-lg px-3 py-2 font-medium text-text underline">
            {t.game.undo}
          </button>
        </p>
      )}

      <div className="mt-8 mb-2 flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-semibold">{session.name}</h2>
        <Link to={`/session/${session.id}/seating`} className={link}>
          {t.game.players}
        </Link>
        <Link to={`/session/${session.id}`} className={link}>
          {t.game.details}
        </Link>
      </div>
      <ScoreTable session={session} person={person} onPickRound={(id) => navigate(`/session/${session.id}/round/${id}`)} />
    </section>
  )
}
