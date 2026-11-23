import { suitOf, valueOf } from '../../domain/game/cards'
import type { Card } from '../../domain/game/cards'
import { useT } from '../../i18n'

const SUITS = ['♠', '♥', '♦', '♣'] as const

type Props = {
  card: Card
  size?: 'md' | 'sm'
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}

/** A playing card. Only the value counts in Gursch; the suit is shown so the cards look like cards. */
export function CardFace({ card, size = 'md', selected, onClick, disabled }: Props) {
  const t = useT()
  const value = valueOf(card)
  const red = suitOf(card) === 1 || suitOf(card) === 2
  const name = t.common.faceCards[value] ?? String(value)
  const box =
    size === 'md'
      ? 'h-16 w-11 rounded-lg text-lg'
      : 'h-9 w-7 rounded-md text-xs'
  const face = selected ? 'bg-accent text-accent-text -translate-y-2' : `bg-surface ring-1 ring-line ${red ? 'text-bad' : 'text-text'}`
  const content = (
    <>
      <span className="font-bold leading-none">{t.common.card(value)}</span>
      <span aria-hidden className="leading-none">
        {SUITS[suitOf(card)]}
      </span>
    </>
  )
  const cls = `flex shrink-0 flex-col items-center justify-center gap-0.5 transition-transform ${box} ${face}`
  if (!onClick) {
    return (
      <span className={cls} role="img" aria-label={name}>
        {content}
      </span>
    )
  }
  return (
    <button type="button" className={`${cls} disabled:opacity-50`} onClick={onClick} disabled={disabled} aria-pressed={selected} aria-label={name}>
      {content}
    </button>
  )
}

/** A short text list of card values, such as "3, 7, K". */
export function cardList(cards: Card[], card: (value: number) => string): string {
  return cards.map((c) => card(valueOf(c))).join(', ')
}
