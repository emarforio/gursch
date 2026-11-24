import { describe, expect, it } from 'vitest'
import { isWeakHand, sortCards, valueOf } from './cards'
import type { Card } from './cards'
import { apply, maxOpenTrade, newRound, publicView } from './engine'
import type { Action, GameState } from './engine'
import { cardsToPlay, checkPlay } from './trick'

function seeded(seed: number): () => number {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296
    return x / 4294967296
  }
}

const pick = <T>(list: T[], random: () => number): T => list[Math.floor(random() * list.length)]!

/** Some plays a player could try: the lowest cards, and sets of each value in the hand. */
function candidatePlays(hand: Card[], n: number): Card[][] {
  const sorted = sortCards(hand)
  const out: Card[][] = [sorted.slice(0, n), sorted.slice(-n), [...sorted.slice(0, n - 1), sorted.at(-1)!]]
  const byValue = new Map<number, Card[]>()
  for (const c of sorted) byValue.set(valueOf(c), [...(byValue.get(valueOf(c)) ?? []), c])
  for (const set of byValue.values()) for (let k = 1; k <= set.length; k++) out.push(set.slice(0, k))
  return out
}

/** A random action allowed for someone at this point, or null if they have nothing to do. */
function randomAction(s: GameState, id: string, random: () => number): Action | null {
  const hand = s.hands[id]!
  switch (s.phase) {
    case 'firstTrade':
      if (isWeakHand(hand) && random() < 0.3) return { type: 'throw' }
      return id === s.leaderId ? { type: 'chooseTrade', count: Math.floor(random() * (s.cardsDealt + 1)) } : null
    case 'firstDiscard':
      return s.discarding[id] ? null : { type: 'discard', cards: hand.slice(0, s.tradeCount!) }
    case 'openTrade': {
      const max = maxOpenTrade({ ...s, cardsLeft: s.deck.length + s.discard.length })
      if (max > 0 && random() < 0.15) return { type: 'propose', count: 1 + Math.floor(random() * max) }
      return s.ready.includes(id) ? null : { type: 'ready' }
    }
    case 'openVote':
      return s.open!.accepted.includes(id) ? null : { type: 'vote', accept: random() < 0.7 }
    case 'openTake': {
      if (s.discarding[id]) return null
      const k = Math.floor(random() * (s.open!.count + 1))
      return { type: 'take', take: s.open!.offered[id]!.slice(0, k), discard: hand.slice(0, k) }
    }
    case 'play': {
      const trick = s.trick!
      if (trick.turnId !== id) return null
      const n = Math.max(1, cardsToPlay(trick, id))
      const legal = candidatePlays(hand, n).filter((cards) => checkPlay(trick, id, hand, cards) === null)
      // The lowest cards are always allowed, so a player can never be stuck.
      expect(legal.length).toBeGreaterThan(0)
      return { type: 'play', cards: pick(legal, random) }
    }
    case 'over':
      return null
  }
}

function playRound(players: number, cards: number, seed: number): GameState {
  const random = seeded(seed)
  const seats = Array.from({ length: players }, (_, i) => `p${i}`)
  let s = newRound(seats, cards, random)
  for (let steps = 0; s.phase !== 'over'; steps++) {
    expect(steps).toBeLessThan(5000)
    const moves = seats.map((id) => [id, randomAction(s, id, random)] as const).filter(([, a]) => a !== null)
    expect(moves.length, `nobody can act in ${s.phase}`).toBeGreaterThan(0)
    const [id, action] = pick(moves, random)
    s = apply(s, id, action!, random)

    // Every card of the deck is somewhere exactly once, and everyone holds the same number of cards between tricks.
    const inTrick = s.trick ? Object.values(s.trick.plays).flat() : []
    const played = s.tricks.flatMap((t) => Object.values(t.plays).flat())
    const held = Object.values(s.hands).flat()
    const offered = s.phase === 'openTake' ? Object.values(s.open!.offered).flat() : []
    const all = [...held, ...s.deck, ...s.discard, ...played, ...inTrick, ...offered]
    expect(new Set(all).size).toBe(52)
    expect(all).toHaveLength(52)
    expect(s.tricks.at(-1) ?? null).toEqual(s.lastTrick)
    if (s.phase !== 'play' || s.trick?.required === 0) {
      expect(new Set(seats.map((p) => s.hands[p]!.length)).size).toBe(1)
    }
    for (const p of seats) for (const c of s.known[p]!) expect(s.hands[p]).toContain(c)
    // A player is only asked to play when they have a choice; forced plays are made by the engine.
    if (s.phase === 'play') {
      const turn = s.trick!.turnId!
      expect(s.hands[turn]!.length).toBeGreaterThan(cardsToPlay(s.trick!, turn))
    }
    publicView(s)
  }
  return s
}

describe('random rounds', () => {
  it('always finish with a score for everyone', () => {
    let runs = 0
    for (let players = 2; players <= 7; players++) {
      for (const cards of [1, 2, 3, 6, Math.floor(52 / players)]) {
        for (let seed = 1; seed <= 12; seed++) {
          const s = playRound(players, cards, seed * 97 + players)
          const { scores, finish } = s.result!
          // Each finished trick was won by someone, and the last one sets the finish.
          expect(s.tricks).toHaveLength(Object.values(s.tricksWon).reduce((a, b) => a + b, 0))
          expect(s.tricks.at(-1)!.required).toBe(finish)
          expect(Object.keys(scores)).toHaveLength(players)
          for (const v of Object.values(scores)) {
            expect(v).toBeGreaterThanOrEqual(2 * finish)
            expect(v).toBeLessThanOrEqual(14 * finish)
          }
          runs++
        }
      }
    }
    expect(runs).toBeGreaterThan(300)
  })
})
