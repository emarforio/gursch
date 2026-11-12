import { useState } from 'react'
import { FormulaError } from '../../domain/formula'
import { roundAmount } from '../../domain/ledger'
import { isValidScore, needsLastTrickLeader, resolveRound, scoreRange } from '../../domain/scoring'
import type { Finish, Scores, SessionPlayer } from '../../domain/types'
import { useT } from '../../i18n'
import { fmtMoney, formulaProblem } from '../format'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { Segmented } from './Controls'

const NUMBER_CARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10]
const FACE_CARDS = [11, 12, 13, 14]

export type RoundResult = {
  finish: Finish
  scores: Scores
  lastTrickLeaderId?: string
  winnerId: string
  loserId: string
  amount: number
}

type Props = {
  seats: string[]
  person: (id: string) => SessionPlayer
  formula: string
  /** Cards dealt this round, which limits the possible finishes. */
  cards: number
  initial?: { finish: Finish; scores: Scores; lastTrickLeaderId?: string }
  saveLabel?: string
  onSave: (result: RoundResult) => void
}

/** Tap-to-enter scores for one round. Give it a new key to start over. */
export function RoundEntry({ seats, person, formula, cards, initial, saveLabel, onSave }: Props) {
  const t = useT()
  const [finish, setFinish] = useState<Finish>(initial?.finish ?? 1)
  const [scores, setScores] = useState<Scores>(initial?.scores ?? {})
  const [active, setActive] = useState<number>(initial ? -1 : 0)
  const [draft, setDraft] = useState('')
  const [leaderId, setLeaderId] = useState<string | undefined>(initial?.lastTrickLeaderId)

  const complete = seats.every((id) => scores[id] !== undefined)
  const tie = complete && needsLastTrickLeader(seats, scores)
  const outcome = complete ? resolveRound(seats, scores, leaderId) : null

  let amount: number | null = null
  let amountError: string | null = null
  if (outcome) {
    try {
      amount = roundAmount(formula, seats, scores, outcome.winnerId, outcome.loserId)
    } catch (e) {
      amountError = e instanceof FormulaError ? formulaProblem(t, e.problem) : t.entry.formulaFailed
    }
  }

  function changeFinish(next: Finish) {
    setFinish(next)
    setScores({})
    setActive(0)
    setDraft('')
    setLeaderId(undefined)
  }

  function enter(value: number) {
    const id = seats[active]
    if (id === undefined) return
    const next = { ...scores, [id]: value }
    setScores(next)
    setLeaderId(undefined)
    setDraft('')
    // Move to the next player without a score, going clockwise.
    let target = -1
    for (let step = 1; step <= seats.length; step++) {
      const i = (active + step) % seats.length
      if (next[seats[i]!] === undefined) {
        target = i
        break
      }
    }
    setActive(target)
  }

  function save() {
    if (!outcome || amount === null) return
    onSave({
      finish,
      scores,
      ...(tie && leaderId ? { lastTrickLeaderId: leaderId } : {}),
      winnerId: outcome.winnerId,
      loserId: outcome.loserId,
      amount,
    })
  }

  const finishOptions = ([1, 2, 3, 4] as Finish[]).filter((f) => f <= cards || f === finish)
  const range = scoreRange(finish)
  const draftValue = Number(draft)
  const draftOk = draft !== '' && isValidScore(draftValue, finish)
  const key = 'h-13 rounded-lg bg-surface text-xl font-semibold active:bg-sunken'
  const faceKey = 'h-13 rounded-lg bg-line text-xl font-semibold active:opacity-70'

  return (
    <div>
      <ul className="overflow-hidden rounded-xl bg-surface">
        {seats.map((id, i) => {
          const p = person(id)
          const s = scores[id]
          const isActive = i === active
          const won = outcome?.winnerId === id
          const lost = outcome?.loserId === id
          const shown = s === undefined ? t.entry.noScore : finish === 1 ? (t.common.faceCards[s] ?? String(s)) : String(s)
          return (
            <li key={id} className={i > 0 ? 'border-t border-line' : ''}>
              <button
                onClick={() => {
                  setActive(i)
                  setDraft('')
                }}
                aria-current={isActive}
                aria-label={[p.name, shown, won && t.common.winner, lost && t.common.loser].filter(Boolean).join(', ')}
                className={`flex h-13 w-full items-center gap-3 border-l-4 px-3 text-left ${
                  isActive ? 'border-accent bg-sunken' : 'border-transparent'
                }`}
              >
                <Avatar name={p.name} avatar={p.avatar} size={32} />
                <span className={`min-w-0 flex-1 truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>{p.name}</span>
                {(won || lost) && (
                  <span className={`text-sm font-semibold ${won ? 'text-good' : 'text-bad'}`}>
                    {won ? t.common.winner : t.common.loser}
                  </span>
                )}
                <span className="tabular w-10 text-right text-xl font-bold">
                  {isActive && finish > 1 && draft !== '' ? (
                    <span className="text-muted">{draft}</span>
                  ) : s === undefined ? (
                    <span className="text-muted">·</span>
                  ) : finish === 1 ? (
                    t.common.card(s)
                  ) : (
                    s
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-4">
        {active >= 0 ? (
          finish === 1 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {NUMBER_CARDS.map((v) => (
                  <button key={v} onClick={() => enter(v)} className={key}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {FACE_CARDS.map((v) => (
                  <button key={v} onClick={() => enter(v)} className={faceKey} aria-label={t.common.faceCards[v]}>
                    {t.common.card(v)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm text-muted">
                {t.entry.sumPrompt(person(seats[active]!).name, finish, range.min, range.max)}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
                  <button key={d} onClick={() => setDraft((draft + d).replace(/^0+/, '').slice(0, 2))} className={key}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button onClick={() => setDraft(draft.slice(0, -1))} disabled={draft === ''}>
                  {t.entry.delete}
                </Button>
                <Button variant="primary" disabled={!draftOk} onClick={() => enter(draftValue)}>
                  {t.entry.next}
                </Button>
              </div>
            </div>
          )
        ) : tie && !leaderId ? (
          <div className="rounded-xl bg-surface p-3" role="status">
            <p className="font-semibold">{t.entry.tieQuestion}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {seats.map((id) => (
                <Button key={id} onClick={() => setLeaderId(id)} className="truncate">
                  {person(id).name}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          outcome && (
            <div className="rounded-xl bg-surface p-3" role="status">
              {amountError ? (
                <p className="text-bad">{t.entry.formulaError(amountError)}</p>
              ) : (
                <p className="text-lg">
                  <span className="font-semibold">{person(outcome.loserId).name}</span> {t.common.owes}{' '}
                  <span className="font-semibold">{person(outcome.winnerId).name}</span>{' '}
                  <span className="tabular font-bold">{fmtMoney(amount!)}</span>
                </p>
              )}
              {tie && leaderId && (
                <p className="mt-1 text-sm text-muted">
                  {t.entry.tieDecided(person(leaderId).name)}{' '}
                  <button className="underline" onClick={() => setLeaderId(undefined)}>
                    {t.entry.change}
                  </button>
                </p>
              )}
              <Button variant="primary" className="mt-3 w-full" disabled={amount === null} onClick={save}>
                {saveLabel ?? t.entry.saveRound}
              </Button>
            </div>
          )
        )}
      </div>

      {finishOptions.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-muted">{t.entry.finishedOn}</span>
          <Segmented
            label={t.entry.finish}
            value={finish}
            onChange={changeFinish}
            options={finishOptions.map((f) => ({ value: f, label: t.common.finishes[f] }))}
          />
        </div>
      )}
    </div>
  )
}
