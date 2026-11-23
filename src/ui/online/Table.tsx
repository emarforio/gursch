import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Lobby } from '../../data/online'
import { isWeakHand, sortCards, valueOf } from '../../domain/game/cards'
import type { Card } from '../../domain/game/cards'
import { fromSeat, maxOpenTrade } from '../../domain/game/engine'
import type { Action, GameProblem, PublicGame } from '../../domain/game/engine'
import { cardsToPlay, checkPlay } from '../../domain/game/trick'
import type { Dictionary } from '../../i18n'
import { useT } from '../../i18n'
import { BottomBar } from '../components/BottomBar'
import { Button } from '../components/Button'
import { ConfirmButton } from '../components/Controls'
import { ScoreTable } from '../components/ScoreTable'
import { SettleUp } from '../components/SettleUp'
import { fmtMoney } from '../format'
import { useWakeLock } from '../wakeLock'
import { CardFace, cardList } from './CardFace'

type Props = {
  lobby: Lobby
  game: PublicGame
  /** This player's id when seated at the table, otherwise null for someone watching. */
  me: string | null
  hand: Card[] | null
  isHost: boolean
  busy: boolean
  problem: GameProblem | null
  failed: boolean
  nameOf: (uid: string) => string
  submit: (action: Action) => void
  nextRound: () => void
  endGame: () => void
}

const toggle = (list: Card[], card: Card) => (list.includes(card) ? list.filter((c) => c !== card) : [...list, card])

/** The game as one player sees it: everyone's public cards, the prompt, and their own hand with what they can do. */
export function Table(props: Props) {
  const { lobby, game, me, isHost, busy, nameOf, submit } = props
  const t = useT()
  const [selected, setSelected] = useState<Card[]>([])
  const [taking, setTaking] = useState<Card[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const hand = props.hand ? sortCards(props.hand) : null
  const session = lobby.session
  const trick = game.trick

  useWakeLock(true)

  // A new step of the game starts with nothing selected.
  const step = `${lobby.round}:${game.phase}:${trick?.turnId}:${hand?.join()}`
  useEffect(() => {
    setSelected([])
    setTaking([])
    setSuggesting(false)
  }, [step])

  const order = me ? fromSeat(game.seats, me) : game.seats
  const names = (ids: string[]) => ids.map((id) => (id === me ? t.play.you : nameOf(id))).join(', ')
  const waitingFor = (done: string[]) => t.play.waitingFor(names(game.seats.filter((id) => !done.includes(id))))
  const card = (c: Card) => t.common.card(valueOf(c))
  const recorded = session && session.rounds.length >= lobby.round ? session.rounds[lobby.round - 1] : undefined

  // What the player is asked to do, and which cards they can pick.
  let prompt = ''
  let pickHand = false
  let actions: ReactNode = null
  const chosen = me !== null && game.chosen.includes(me)

  switch (game.phase) {
    case 'firstTrade': {
      const leads = game.leaderId === me
      prompt = leads ? t.play.youLead : t.play.leaderChooses(nameOf(game.leaderId))
      actions = (
        <>
          {leads && (
            <div role="group" aria-label={t.play.tradeCount} className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: game.cardsDealt + 1 }, (_, n) => (
                <Button key={n} className="tabular px-0 text-lg" disabled={busy} onClick={() => submit({ type: 'chooseTrade', count: n })}>
                  {n}
                </Button>
              ))}
            </div>
          )}
          {hand && isWeakHand(hand) && (
            <div className="mt-3">
              <p className="mb-2 text-sm text-muted">{t.play.throwNote}</p>
              <Button className="w-full" disabled={busy} onClick={() => submit({ type: 'throw' })}>
                {t.play.throwHand}
              </Button>
            </div>
          )}
        </>
      )
      break
    }

    case 'firstDiscard': {
      const n = game.tradeCount ?? 0
      if (me && !chosen) {
        prompt = t.play.pickDiscard(n)
        pickHand = true
        actions = (
          <Button variant="primary" className="h-13 w-full text-lg" disabled={busy || selected.length !== n} onClick={() => submit({ type: 'discard', cards: selected })}>
            {t.play.trade(n)}
          </Button>
        )
      } else {
        prompt = waitingFor(game.chosen)
      }
      break
    }

    case 'openTrade': {
      const ready = me !== null && game.ready.includes(me)
      prompt = ready ? waitingFor(game.ready) : t.play.openPrompt
      const max = maxOpenTrade(game)
      if (me) {
        actions = suggesting ? (
          <div>
            <p className="mb-2 text-sm text-muted">{t.play.openHowMany}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <Button key={n} className="tabular px-0 text-lg" disabled={busy} onClick={() => submit({ type: 'propose', count: n })}>
                  {n}
                </Button>
              ))}
            </div>
            <Button variant="quiet" className="mt-2 w-full" onClick={() => setSuggesting(false)}>
              {t.common.cancel}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {!ready && (
              <Button variant="primary" className="h-13 w-full text-lg" disabled={busy} onClick={() => submit({ type: 'ready' })}>
                {t.play.ready}
              </Button>
            )}
            {max > 0 && (
              <Button className="w-full" disabled={busy} onClick={() => setSuggesting(true)}>
                {t.play.suggestOpen}
              </Button>
            )}
          </div>
        )
      }
      break
    }

    case 'openVote': {
      const open = game.open!
      const agreed = me !== null && open.accepted.includes(me)
      if (open.proposerId === me) prompt = `${t.play.youProposed(open.count)} ${waitingFor(open.accepted)}`
      else if (agreed || !me) prompt = `${t.play.proposed(nameOf(open.proposerId), open.count)} ${waitingFor(open.accepted)}`
      else {
        prompt = t.play.proposed(nameOf(open.proposerId), open.count)
        actions = (
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={busy} onClick={() => submit({ type: 'vote', accept: false })}>
              {t.play.refuse}
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => submit({ type: 'vote', accept: true })}>
              {t.play.agree}
            </Button>
          </div>
        )
      }
      break
    }

    case 'openTake': {
      if (me && !chosen) {
        prompt = t.play.pickTake
        pickHand = true
        const same = taking.length === selected.length
        actions = (
          <>
            {!same && <p className="mb-2 text-sm text-muted">{t.play.pickSame}</p>}
            <Button
              variant="primary"
              className="h-13 w-full text-lg"
              disabled={busy || !same}
              onClick={() => submit({ type: 'take', take: taking, discard: selected })}
            >
              {taking.length === 0 ? t.play.takeNone : t.play.takeAndDiscard(taking.length)}
            </Button>
          </>
        )
      } else {
        prompt = waitingFor(game.chosen)
      }
      break
    }

    case 'play': {
      if (!trick) break
      if (!me || trick.turnId !== me || !hand) {
        prompt = trick.turnId ? t.play.turnOf(nameOf(trick.turnId)) : ''
        break
      }
      const rule = trick.required === 0 ? t.play.startTrick : t.play.follow(cardsToPlay(trick, me), t.common.card(trick.bar))
      prompt = `${t.play.yourTurn} ${rule}`
      pickHand = true
      const problem = selected.length > 0 ? checkPlay(trick, me, hand, selected) : null
      actions = (
        <>
          {problem && (
            <p className="mb-2 text-sm text-bad" role="alert">
              {t.play.problems[problem]}
            </p>
          )}
          <Button
            variant="primary"
            className="h-13 w-full text-lg"
            disabled={busy || selected.length === 0 || problem !== null}
            onClick={() => submit({ type: 'play', cards: selected })}
          >
            {t.play.playCards(selected.length)}
          </Button>
        </>
      )
      break
    }

    case 'over': {
      prompt = t.play.roundOver
      actions = isHost ? (
        <Button variant="primary" className="h-13 w-full text-lg" disabled={!recorded} onClick={props.nextRound}>
          {t.play.nextRound}
        </Button>
      ) : (
        <p className="text-muted">{t.play.waitingNext(nameOf(lobby.hostUid))}</p>
      )
      break
    }
  }

  const offered = game.phase === 'openTake' && me && !chosen ? (game.open?.offered[me] ?? []) : []

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="text-xl font-bold">{t.play.heading(lobby.round, game.cardsDealt)}</h1>
      <p className="mt-1 text-sm text-muted">{t.play.cardsLeft(game.cardsLeft)}</p>

      <Notices game={game} t={t} nameOf={nameOf} card={card} />

      <ol className="mt-4 divide-y divide-line rounded-xl bg-surface">
        {order.map((id) => (
          <SeatRow key={id} id={id} me={me} game={game} t={t} nameOf={nameOf} />
        ))}
      </ol>

      {recorded && game.phase === 'over' && (
        <p className="mt-3 rounded-xl bg-surface px-3 py-2.5" role="status">
          <span className="font-semibold">{nameOf(recorded.loserId)}</span> {t.common.owes}{' '}
          <span className="font-semibold">{nameOf(recorded.winnerId)}</span> <span className="tabular font-bold">{fmtMoney(recorded.amount)}</span>
        </p>
      )}

      {session && session.rounds.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-semibold">{t.common.scores}</h2>
          <ScoreTable session={session} person={(id) => ({ id, name: nameOf(id) })} />
          <h2 className="mt-6 mb-2 font-semibold">{t.common.settleUp}</h2>
          <SettleUp session={session} person={(id) => ({ id, name: nameOf(id) })} />
        </>
      )}
      {isHost && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{t.lobby.hostNote}</p>
          <ConfirmButton label={t.play.endGame} onConfirm={props.endGame} />
        </div>
      )}

      <BottomBar>
        {prompt && (
          <p className="mb-3 font-medium" role="status">
            {busy ? t.play.sending : prompt}
          </p>
        )}
        {offered.length > 0 && (
          <div className="mb-3">
            <h2 className="mb-1.5 text-sm text-muted">{t.play.onOffer}</h2>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {offered.map((c) => (
                <CardFace key={c} card={c} selected={taking.includes(c)} disabled={busy} onClick={() => setTaking(toggle(taking, c))} />
              ))}
            </div>
          </div>
        )}
        {hand && (
          <div className="mb-3">
            <h2 className="sr-only">{t.play.yourHand}</h2>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {hand.map((c) => (
                <CardFace
                  key={c}
                  card={c}
                  selected={selected.includes(c)}
                  disabled={busy}
                  onClick={pickHand ? () => setSelected(toggle(selected, c)) : undefined}
                />
              ))}
            </div>
          </div>
        )}
        {(props.problem || props.failed) && (
          <p className="mb-2 text-sm text-bad" role="alert">
            {props.failed ? t.online.failed : t.play.problems[props.problem!]}
          </p>
        )}
        {actions}
      </BottomBar>
    </section>
  )
}

type RowProps = { id: string; me: string | null; game: PublicGame; t: Dictionary; nameOf: (uid: string) => string }

/** One player at the table: their public cards and where they stand in the trick. */
function SeatRow({ id, me, game, t, nameOf }: RowProps) {
  const trick = game.phase === 'over' ? game.lastTrick : game.trick
  const inTrick = trick?.plays[id] ?? []
  const turn = game.phase === 'play' && trick?.turnId === id
  const offered = game.phase === 'openTake' ? (game.open?.offered[id] ?? []) : []
  const known = game.phase === 'over' ? [] : (game.known[id] ?? [])
  const score = game.phase === 'over' ? game.result?.scores[id] : undefined
  const started = trick && trick.required > 0

  return (
    <li className={`px-3 py-2.5 ${turn ? 'border-l-4 border-accent bg-sunken' : ''}`} aria-current={turn ? 'step' : undefined}>
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 truncate font-medium">{id === me ? t.play.you : nameOf(id)}</span>
        {game.leaderId === id && <span className="text-sm text-muted">{t.play.leader}</span>}
        {started && trick.out.includes(id) && <span className="text-sm text-muted">{t.play.out}</span>}
        {started && trick.holderId === id && game.phase === 'play' && <span className="text-sm font-medium text-accent">{t.play.holds}</span>}
        <span className="tabular ml-auto shrink-0 text-sm text-muted">
          {score !== undefined ? score : t.play.cardCount(game.handSizes[id] ?? 0)}
        </span>
      </div>
      {(inTrick.length > 0 || known.length > 0 || offered.length > 0) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {inTrick.map((c) => (
            <CardFace key={c} card={c} size="sm" />
          ))}
          {offered.map((c) => (
            <CardFace key={c} card={c} size="sm" />
          ))}
          {known.length > 0 && (
            <span className={`flex items-center gap-1 ${inTrick.length + offered.length > 0 ? 'ml-2' : ''}`}>
              <span className="text-xs text-muted">{t.play.faceUp}</span>
              {known.map((c) => (
                <CardFace key={c} card={c} size="sm" />
              ))}
            </span>
          )}
        </div>
      )}
    </li>
  )
}

type NoticeProps = { game: PublicGame; t: Dictionary; nameOf: (uid: string) => string; card: (c: Card) => string }

/** What happened that everyone should know: how the leader was picked, thrown hands, a refused trade, the last trick. */
function Notices({ game, t, nameOf, card }: NoticeProps) {
  const lines: string[] = []
  const beforePlay = game.phase !== 'play' && game.phase !== 'over'
  const firstTrick = game.phase === 'play' && !game.lastTrick && game.trick?.required === 0
  if ((beforePlay || firstTrick) && game.leaderDraws.length > 0) {
    const draws = game.leaderDraws.map((d) => Object.entries(d).map(([id, c]) => `${nameOf(id)} ${card(c)}`).join(', '))
    lines.push(t.play.leaderDraws(draws.join('; ')))
  }
  if (beforePlay) for (const x of game.thrown) lines.push(t.play.threw(nameOf(x.playerId), cardList(x.cards, t.common.card)))
  if (game.phase === 'openTrade' && game.refusedBy) lines.push(t.play.refused(nameOf(game.refusedBy)))
  if (game.phase === 'play' && game.lastTrick && game.trick?.required === 0) lines.push(t.play.lastTrick(nameOf(game.lastTrick.holderId)))
  if (lines.length === 0) return null
  return (
    <div className="mt-3 space-y-1.5">
      {lines.map((line) => (
        <p key={line} className="rounded-lg bg-sunken px-3 py-2 text-sm">
          {line}
        </p>
      ))}
    </div>
  )
}
