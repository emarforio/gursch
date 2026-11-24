import { useEffect, useRef, useState } from 'react'
import type { Card } from '../../domain/game/cards'
import { fromSeat } from '../../domain/game/engine'
import type { PublicGame } from '../../domain/game/engine'
import type { Trick } from '../../domain/game/trick'
import { useT } from '../../i18n'
import { CardFace, CardTag } from './CardFace'
import type { CardSize } from './CardFace'

type Props = {
  game: PublicGame
  /** This player's id when seated, so they sit at the bottom. Null for someone watching. */
  me: string | null
  nameOf: (uid: string) => string
}

/** A point on an ellipse around the middle of the table, as CSS percentages. `rx` and `ry` are percent of the table. */
function at(angle: number, rx: number, ry: number) {
  return { left: `${50 + rx * Math.cos(angle)}%`, top: `${50 + ry * Math.sin(angle)}%` }
}

/**
 * The players seated round a card table, clockwise, with this player at the
 * bottom. The cards each player puts into a trick lie on the felt in front of
 * them. Between tricks the last trick stays on the table, faded except for the
 * cards that took it, until the next card is played. Tapping a player shows
 * everything they have played this round.
 */
export function PokerTable({ game, me, nameOf }: Props) {
  const t = useT()
  const [viewing, setViewing] = useState<string | null>(null)
  const order = me ? fromSeat(game.seats, me) : game.seats
  const crowded = order.length > 6
  const size: CardSize = crowded ? 'xs' : 'sm'
  // Cards lie between each seat and the deck: close to the middle, clear of the name tags.
  const [spotX, spotY] = crowded ? [18, 24] : [13, 19]

  const current = game.phase === 'play' ? game.trick : null
  const between = current !== null && current.required === 0
  // The cards on the table: the trick being played, or the one just finished.
  const shown = game.phase === 'over' || between ? game.lastTrick : current
  const faded = between

  return (
    <>
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-md">
        <div
          aria-hidden
          className="absolute inset-x-[14%] inset-y-[7%] rounded-[50%] border-[10px] border-felt-edge bg-felt shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]"
        />
        <Deck count={game.cardsLeft} label={t.play.cardsLeft(game.cardsLeft)} />

        {order.map((id, i) => {
          const angle = Math.PI / 2 + (i * 2 * Math.PI) / order.length
          const name = id === me ? t.play.you : nameOf(id)
          const offered = game.phase === 'openTake' ? (game.open?.offered[id] ?? []) : []
          const played = shown?.plays[id] ?? []
          const cards = offered.length > 0 ? offered : played
          const took = shown?.holderId === id && played.length > 0
          const open = () => setViewing(id)
          return (
            <div key={id}>
              {cards.length > 0 && (
                <button
                  type="button"
                  onClick={open}
                  aria-label={t.play.seatPlays(name)}
                  className={`absolute flex -translate-x-1/2 -translate-y-1/2 rounded-md p-0.5 ${took && !faded && game.phase === 'play' ? 'ring-2 ring-amber-300' : ''}`}
                  style={at(angle, spotX, spotY)}
                >
                  {cards.map((c, k) => (
                    <span key={c} className={k > 0 ? (size === 'sm' ? '-ml-4.5' : '-ml-3.5') : ''}>
                      <CardFace card={c} size={size} dim={(faded && !took) || (current?.out.includes(id) ?? false)} />
                    </span>
                  ))}
                </button>
              )}
              <Seat id={id} name={name} game={game} style={at(angle, 36, 43)} onOpen={open} />
            </div>
          )
        })}
      </div>
      {viewing && <History id={viewing} name={viewing === me ? null : nameOf(viewing)} game={game} onClose={() => setViewing(null)} />}
    </>
  )
}

/** The face-down pile in the middle, with the number of cards left to draw. */
function Deck({ count, label }: { count: number; label: string }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" role="img" aria-label={label}>
      {count > 0 && (
        <span className="flex h-12 w-9 items-center justify-center rounded-md bg-felt-edge text-sm font-bold text-felt-text shadow-[2px_2px_0_var(--felt-edge),4px_4px_0_rgba(0,0,0,0.25)] ring-2 ring-card">
          {count}
        </span>
      )}
    </div>
  )
}

type SeatProps = { id: string; name: string; game: PublicGame; style: { left: string; top: string }; onOpen: () => void }

/** A player's place at the table: name, cards in hand or score, and what everyone knows about them. */
function Seat({ id, name, game, style, onOpen }: SeatProps) {
  const t = useT()
  const trick = game.phase === 'play' ? game.trick : null
  const turn = trick?.turnId === id
  const started = trick !== null && trick.required > 0
  const score = game.phase === 'over' ? game.result?.scores[id] : undefined
  const known = game.phase === 'over' ? [] : (game.known[id] ?? [])
  const out = started && trick.out.includes(id)
  const holds = started && trick.holderId === id
  const pill = 'absolute rounded-full bg-amber-300 px-1.5 text-[10px] leading-4 font-bold whitespace-nowrap text-black'

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t.play.seatPlays(name)}
      aria-current={turn ? 'step' : undefined}
      className={`absolute flex w-max max-w-22 -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-xl px-2 py-1 text-center shadow-md ${
        turn ? 'bg-accent text-accent-text ring-2 ring-white/70' : 'bg-surface text-text ring-1 ring-black/10'
      }`}
      style={style}
    >
      {game.leaderId === id && (
        <span className={`${pill} -top-2.5`}>{t.play.leader}</span>
      )}
      <span className="max-w-full truncate text-sm font-semibold">{name}</span>
      <span className={`tabular text-[11px] leading-tight whitespace-nowrap ${turn ? '' : 'text-muted'}`}>
        {score !== undefined ? score : t.play.cardCount(game.handSizes[id] ?? 0)}
        {out && ` · ${t.play.out}`}
      </span>
      {known.length > 0 && (
        <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
          {known.map((c) => (
            <CardTag key={c} card={c} />
          ))}
        </span>
      )}
      {/* The outline round the cards on the table shows this; the text is for screen readers. */}
      {holds && <span className="sr-only">{t.play.holds}</span>}
    </button>
  )
}

type HistoryProps = { id: string; name: string | null; game: PublicGame; onClose: () => void }

/** Every trick of the round so far as one player played it, in a dialog. `name` is null for this player. */
function History({ id, name, game, onClose }: HistoryProps) {
  const t = useT()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => ref.current?.showModal(), [])

  // Rounds dealt before the history was kept have no list.
  const rows: { label: string; trick: Trick }[] = (game.tricks ?? []).map((trick, i) => ({ label: t.play.trickNumber(i + 1), trick }))
  if (game.phase === 'play' && game.trick && (game.trick.plays[id]?.length ?? 0) > 0) rows.push({ label: t.play.thisTrick, trick: game.trick })
  const known = game.phase === 'over' ? [] : (game.known[id] ?? [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="history-title"
      className="m-auto max-h-[80vh] w-[min(24rem,calc(100%-2rem))] rounded-2xl bg-surface p-0 text-text backdrop:bg-black/50"
    >
      <div className="p-4">
        <h2 id="history-title" className="text-lg font-bold">
          {name === null ? t.play.historyYou : t.play.historyTitle(name)}
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-muted">{t.play.nothingPlayed}</p>
        ) : (
          <ol className="mt-3 divide-y divide-line">
            {rows.map(({ label, trick }) => (
              <li key={label} className="flex items-center gap-3 py-2">
                <span className="w-20 shrink-0 text-sm text-muted">{label}</span>
                <span className="flex flex-wrap gap-1">
                  {(trick.plays[id] ?? []).map((c: Card) => (
                    <CardFace key={c} card={c} size="sm" />
                  ))}
                </span>
                <span className="ml-auto text-sm font-medium">
                  {trick.holderId === id && trick.turnId === null ? t.play.tookIt : trick.out.includes(id) ? t.play.out : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
        {known.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1 text-sm text-muted">
            {t.play.faceUp}:
            {known.map((c) => (
              <CardTag key={c} card={c} />
            ))}
          </p>
        )}
        <form method="dialog" className="mt-4">
          <button className="h-11 w-full rounded-lg bg-sunken font-medium">{t.play.close}</button>
        </form>
      </div>
    </dialog>
  )
}
