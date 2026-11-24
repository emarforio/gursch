import type { ReactElement } from 'react'
import { suitOf, valueOf } from '../../domain/game/cards'
import type { Card } from '../../domain/game/cards'
import { useT } from '../../i18n'

const SUITS = ['♠', '♥', '♦', '♣'] as const

export type CardSize = 'lg' | 'sm' | 'xs'

type Props = {
  card: Card
  /** `lg` in the hand, `sm` and `xs` on the table. */
  size?: CardSize
  selected?: boolean
  dim?: boolean
  onClick?: () => void
  disabled?: boolean
}

const boxes: Record<CardSize, string> = {
  lg: 'h-21 w-14 rounded-lg',
  sm: 'h-12 w-9 rounded-md',
  xs: 'h-9 w-6.5 rounded',
}

/**
 * A playing card, white like a real one in both themes. Only the value counts
 * in Gursch; the suit is shown so the cards look like cards. The value sits in
 * the top left corner so it stays readable when cards overlap.
 */
export function CardFace({ card, size = 'lg', selected, dim, onClick, disabled }: Props) {
  const t = useT()
  const value = valueOf(card)
  const suit = SUITS[suitOf(card)]
  const red = suitOf(card) === 1 || suitOf(card) === 2
  const name = t.common.faceCards[value] ?? String(value)
  const lift = selected ? '-translate-y-3 ring-3 ring-accent shadow-lg' : 'ring-1 ring-black/15 shadow-sm'
  const cls = `relative block shrink-0 select-none bg-card transition-transform ${red ? 'text-card-red' : 'text-card-text'} ${boxes[size]} ${lift} ${dim ? 'opacity-55' : ''}`
  const content =
    size === 'lg' ? (
      <>
        <span className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
          <span className="text-xl font-bold">{t.common.card(value)}</span>
          <span aria-hidden className="text-base">
            {suit}
          </span>
        </span>
        <span aria-hidden className="absolute right-1.5 bottom-1 text-3xl leading-none">
          {suit}
        </span>
      </>
    ) : (
      <span className={`absolute flex flex-col items-center leading-none ${size === 'sm' ? 'top-1 left-1 gap-0.5 text-sm' : 'top-0.5 left-0.5 text-[11px]'}`}>
        <span className="font-bold">{t.common.card(value)}</span>
        <span aria-hidden>{suit}</span>
      </span>
    )
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

/** A face-up card as a small tag, for cards everyone has seen in a hand. */
export function CardTag({ card }: { card: Card }) {
  const t = useT()
  const value = valueOf(card)
  const red = suitOf(card) === 1 || suitOf(card) === 2
  return (
    <span
      className={`inline-flex h-4.5 items-center rounded-sm bg-card px-1 text-[11px] leading-none font-bold ring-1 ring-black/15 ${red ? 'text-card-red' : 'text-card-text'}`}
      role="img"
      aria-label={t.common.faceCards[value] ?? String(value)}
    >
      {t.common.card(value)}
      <span aria-hidden>{SUITS[suitOf(card)]}</span>
    </span>
  )
}

/**
 * A row of cards that always fits its width: when there is not room for all of
 * them side by side they overlap, with each value still showing in its corner.
 */
export function Fan({ width, children }: { width: string; children: ReactElement[] }) {
  const count = children.length
  return (
    <div className="flex justify-center">
      {children.map((child, i) => (
        <div
          key={child.key ?? i}
          className="shrink-0"
          style={i < count - 1 ? { width: `min(calc(${width} + 0.375rem), calc((100% - ${width}) / ${Math.max(count - 1, 1)}))` } : undefined}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

/** A short text list of card values, such as "3, 7, K". */
export function cardList(cards: Card[], card: (value: number) => string): string {
  return cards.map((c) => card(valueOf(c))).join(', ')
}
