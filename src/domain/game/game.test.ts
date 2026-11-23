import { describe, expect, it } from 'vitest'
import { DECK, isWeakHand, shuffle, sortCards, valueOf } from './cards'
import type { Card } from './cards'
import { apply, GameError, maxOpenTrade, newRound, publicView } from './engine'
import type { Action, GameState } from './engine'
import { applyPlay, checkPlay, startTrick } from './trick'
import type { Trick } from './trick'

/** A card of the given value; `n` picks the suit so several cards of one value can be made. */
const c = (value: number, n = 0): Card => n * 13 + value - 2

/** A seeded random number generator, so shuffles are repeatable. */
function seeded(seed: number): () => number {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296
    return x / 4294967296
  }
}

const seats = ['A', 'B', 'C']

/** Plays a sequence of [player, cards] into a trick, checking each play first. */
function playAll(hands: Record<string, Card[]>, moves: [string, Card[]][], trick: Trick = startTrick(seats, moves[0]![0])): Trick {
  for (const [id, cards] of moves) {
    expect(checkPlay(trick, id, hands[id]!, cards), `${id} plays ${cards.map(valueOf)}`).toBeNull()
    trick = applyPlay(trick, seats, id, cards)
    hands[id] = hands[id]!.filter((x) => !cards.includes(x))
  }
  return trick
}

describe('cards', () => {
  it('has 52 distinct cards with values 2 to 14', () => {
    expect(new Set(DECK).size).toBe(52)
    expect(Math.min(...DECK.map(valueOf))).toBe(2)
    expect(Math.max(...DECK.map(valueOf))).toBe(14)
    expect(DECK.filter((x) => valueOf(x) === 14)).toHaveLength(4)
  })

  it('shuffles without losing cards', () => {
    expect(shuffle(DECK, seeded(1)).sort((a, b) => a - b)).toEqual([...DECK])
  })

  it('knows a weak hand', () => {
    expect(isWeakHand([c(2), c(10), c(7)])).toBe(true)
    expect(isWeakHand([c(2), c(11)])).toBe(false)
  })

  it('sorts by value', () => {
    expect(sortCards([c(14), c(3, 2), c(3), c(9)]).map(valueOf)).toEqual([3, 3, 9, 14])
  })
})

describe('following a single card', () => {
  it('allows the same or higher value, or the lowest card, and nothing in between', () => {
    const t = playAll({ A: [c(8)] }, [['A', [c(8)]]])
    const hand = [c(3), c(6), c(8, 1), c(12)]
    expect(checkPlay(t, 'B', hand, [c(12)])).toBeNull()
    expect(checkPlay(t, 'B', hand, [c(8, 1)])).toBeNull()
    expect(checkPlay(t, 'B', hand, [c(3)])).toBeNull()
    expect(checkPlay(t, 'B', hand, [c(6)])).toBe('between')
    expect(checkPlay(t, 'C', hand, [c(12)])).toBe('notYourTurn')
  })

  it('gives the trick to the last player of the highest value', () => {
    const t = playAll({ A: [c(9)], B: [c(9, 1)], C: [c(4)] }, [
      ['A', [c(9)]],
      ['B', [c(9, 1)]],
      ['C', [c(4)]],
    ])
    expect(t.turnId).toBeNull()
    expect(t.holderId).toBe('B')
    expect(t.out).toEqual(['C'])
  })

  it('only lets an ace beat an ace', () => {
    const t = playAll({ A: [c(14)] }, [['A', [c(14)]]])
    expect(checkPlay(t, 'B', [c(13), c(5)], [c(13)])).toBe('between')
    expect(checkPlay(t, 'B', [c(13), c(5)], [c(5)])).toBeNull()
  })
})

describe('playing several cards', () => {
  it('requires a set to start with several cards', () => {
    const t = startTrick(seats, 'A')
    expect(checkPlay(t, 'A', [c(6), c(6, 1), c(7)], [c(6), c(6, 1)])).toBeNull()
    expect(checkPlay(t, 'A', [c(6), c(6, 1), c(7)], [c(6), c(7)])).toBe('notASet')
  })

  it('judges each card on its own against a doffel', () => {
    const t = playAll({ A: [c(6), c(6, 1)] }, [['A', [c(6), c(6, 1)]]])
    const hand = [c(4), c(5), c(11), c(13)]
    expect(checkPlay(t, 'B', hand, [c(11), c(4)])).toBeNull()
    expect(checkPlay(t, 'B', hand, [c(4), c(5)])).toBeNull()
    expect(checkPlay(t, 'B', hand, [c(11), c(5)])).toBe('between')
    expect(checkPlay(t, 'B', hand, [c(11)])).toBe('tooFew')
  })

  it('does not raise the bar with two different cards', () => {
    const t = playAll({ A: [c(6), c(6, 1)], B: [c(11), c(4), c(9)] }, [
      ['A', [c(6), c(6, 1)]],
      ['B', [c(11), c(4)]],
    ])
    expect(t.bar).toBe(6)
    expect(t.out).toEqual(['B'])
    expect(t.holderId).toBe('A')
  })

  it('example 1: a late top-up that matches the bar wins', () => {
    const hands = { A: [c(8), c(10, 2), c(2)], B: [c(10), c(10, 1), c(5)], C: [c(11), c(3), c(12)] }
    const t = playAll(hands, [
      ['A', [c(8)]],
      ['B', [c(10), c(10, 1)]],
      ['C', [c(11), c(3)]],
      ['A', [c(10, 2)]],
    ])
    expect(t.required).toBe(2)
    expect(t.out).toEqual(['C'])
    expect(t.turnId).toBeNull()
    expect(t.holderId).toBe('A')
  })

  it('example 2: sets raise the bar and the turn goes round again', () => {
    const hands = { A: [c(8), c(10), c(13)], B: [c(3), c(4), c(12)], C: [c(9), c(9, 1), c(14)] }
    let t = playAll(hands, [
      ['A', [c(8)]],
      ['B', [c(3)]],
      ['C', [c(9), c(9, 1)]],
    ])
    expect(t.turnId).toBe('A')
    t = playAll(hands, [['A', [c(10)]]], t)
    expect(t.bar).toBe(10)
    expect(t.turnId).toBe('B')
    // B cannot win any more, but still follows the rule.
    expect(checkPlay(t, 'B', hands.B, [c(12)])).toBeNull()
    t = playAll(hands, [['B', [c(4)]]], t)
    expect(t.turnId).toBeNull()
    expect(t.holderId).toBe('A')
  })

  it('lets a set on a single card raise the count only when it matches the bar', () => {
    const t = playAll({ A: [c(9)] }, [['A', [c(9)]]])
    expect(checkPlay(t, 'B', [c(5), c(5, 1), c(12)], [c(5), c(5, 1)])).toBe('setTooLow')
    expect(checkPlay(t, 'B', [c(9, 1), c(9, 2), c(12)], [c(9, 1), c(9, 2)])).toBeNull()
  })

  it('needs exactly the missing cards on a top-up', () => {
    const hands = { A: [c(8), c(10), c(13)], B: [c(9), c(9, 1), c(2)], C: [c(11), c(11, 1), c(3)] }
    const t = playAll(hands, [
      ['A', [c(8)]],
      ['B', [c(9), c(9, 1)]],
      ['C', [c(11), c(11, 1)]],
    ], startTrick(seats, 'A'))
    expect(checkPlay(t, 'A', hands.A, [c(10), c(13)])).toBe('tooMany')
    expect(checkPlay(t, 'A', hands.A, [c(13)])).toBeNull()
  })
})

/** Puts chosen hands into a state and skips to play, for testing whole rounds. */
function rigged(hands: Record<string, Card[]>, leaderId = 'A'): GameState {
  const s = newRound(seats, hands.A!.length, seeded(1))
  s.hands = structuredClone(hands)
  s.known = { A: [], B: [], C: [] }
  s.leaderId = leaderId
  s.phase = 'play'
  s.trick = startTrick(seats, leaderId)
  return s
}

function run(s: GameState, moves: [string, Action][]): GameState {
  for (const [id, action] of moves) s = apply(s, id, action, seeded(2))
  return s
}

describe('a round', () => {
  it('deals the cards with the last one face up and picks the leader', () => {
    const s = newRound(['A', 'B', 'C', 'D'], 6, seeded(7))
    const all = Object.values(s.hands).flat()
    expect(all).toHaveLength(24)
    expect(new Set([...all, ...s.deck, ...s.discard]).size).toBe(52)
    for (const id of s.seats) expect(s.known[id]).toEqual([s.hands[id]!.at(-1)])
    const top = Math.max(...s.seats.map((id) => valueOf(s.known[id]![0]!)))
    const tied = s.seats.filter((id) => valueOf(s.known[id]![0]!) === top)
    expect(tied).toContain(s.leaderId)
    if (tied.length > 1) expect(s.leaderDraws.length).toBeGreaterThan(0)
    expect(s.phase).toBe('firstTrade')
  })

  it('always breaks a tie for leader with extra cards', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = newRound(['A', 'B', 'C', 'D', 'E'], 4, seeded(seed))
      if (s.leaderDraws.length === 0) continue
      const last = s.leaderDraws.at(-1)!
      const top = Math.max(...Object.values(last).map(valueOf))
      expect(Object.keys(last).filter((id) => valueOf(last[id]!) === top)).toEqual([s.leaderId])
    }
  })

  it('deals one card face down and picks the leader with extra cards', () => {
    const s = newRound(seats, 1, seeded(3))
    expect(s.leaderDraws.length).toBeGreaterThan(0)
    expect(s.known).toEqual({ A: [], B: [], C: [] })
    expect(s.phase).toBe('play')
    expect(s.trick?.starterId).toBe(s.leaderId)
  })

  it('skips the first trade with two cards each', () => {
    expect(newRound(seats, 2, seeded(3)).phase).toBe('openTrade')
  })

  it('runs the first trade', () => {
    let s = newRound(seats, 5, seeded(4))
    const leader = s.leaderId
    const other = seats.find((id) => id !== leader)!
    expect(() => apply(s, other, { type: 'chooseTrade', count: 2 }, seeded(1))).toThrow(GameError)
    s = run(s, [[leader, { type: 'chooseTrade', count: 2 }]])
    expect(s.phase).toBe('firstDiscard')
    const before = structuredClone(s.hands)
    for (const id of seats) s = run(s, [[id, { type: 'discard', cards: before[id]!.slice(0, 2) }]])
    expect(s.phase).toBe('openTrade')
    for (const id of seats) {
      expect(s.hands[id]).toHaveLength(5)
      expect(s.hands[id]).not.toContain(before[id]![0])
      expect(s.hands[id]!.slice(0, 3)).toEqual(before[id]!.slice(2))
    }
    expect(s.discard).toHaveLength(6 + s.leaderDraws.reduce((n, d) => n + Object.keys(d).length, 0))
  })

  it('lets a weak hand be thrown only before the leader chooses', () => {
    let s = newRound(seats, 3, seeded(5))
    s.hands.B = [c(2), c(5), c(10)]
    s = run(s, [['B', { type: 'throw' }]])
    expect(s.thrown).toEqual([{ playerId: 'B', cards: [c(2), c(5), c(10)] }])
    expect(s.hands.B).toHaveLength(3)
    expect(s.known.B).toEqual([])
    s.hands.C = [c(2), c(5, 1), c(13)]
    expect(() => apply(s, 'C', { type: 'throw' }, seeded(1))).toThrow('notWeak')
    s = run(s, [[s.leaderId, { type: 'chooseTrade', count: 0 }]])
    expect(() => apply(s, 'B', { type: 'throw' }, seeded(1))).toThrow('wrongPhase')
  })

  it('runs an open trade that everyone agrees to', () => {
    let s = newRound(seats, 4, seeded(6))
    s = run(s, [[s.leaderId, { type: 'chooseTrade', count: 0 }], ['A', { type: 'propose', count: 2 }]])
    expect(s.phase).toBe('openVote')
    s = run(s, [['B', { type: 'vote', accept: true }], ['C', { type: 'vote', accept: true }]])
    expect(s.phase).toBe('openTake')
    const offered = s.open!.offered
    for (const id of seats) expect(offered[id]).toHaveLength(2)
    const handA = [...s.hands.A!]
    s = run(s, [
      ['A', { type: 'take', take: [offered.A![0]!], discard: [handA[0]!] }],
      ['B', { type: 'take', take: [], discard: [] }],
    ])
    expect(publicView(s).chosen).toEqual(['A', 'B'])
    s = run(s, [['C', { type: 'take', take: offered.C!, discard: s.hands.C!.slice(0, 2) }]])
    expect(s.phase).toBe('openTrade')
    expect(s.hands.A).toContain(offered.A![0])
    expect(s.hands.A).not.toContain(handA[0])
    expect(s.known.A).toContain(offered.A![0])
    expect(s.known.C).toEqual(expect.arrayContaining(offered.C!))
    expect(s.hands.C).toHaveLength(4)
  })

  it('drops an open trade when someone refuses, and starts play when all are ready', () => {
    let s = newRound(seats, 2, seeded(6))
    s = run(s, [['B', { type: 'propose', count: 1 }], ['C', { type: 'vote', accept: false }]])
    expect(s.phase).toBe('openTrade')
    expect(s.refusedBy).toBe('C')
    s = run(s, [['A', { type: 'ready' }], ['B', { type: 'ready' }], ['C', { type: 'ready' }]])
    expect(s.phase).toBe('play')
    expect(s.trick!.turnId).toBe(s.leaderId)
  })

  it('limits an open trade to what the cards allow', () => {
    expect(maxOpenTrade({ seats, cardsDealt: 5, cardsLeft: 30 })).toBe(5)
    expect(maxOpenTrade({ seats, cardsDealt: 5, cardsLeft: 7 })).toBe(2)
  })

  it('scores the last trick and hands the lead to the trick winner', () => {
    let s = rigged({ A: [c(13), c(4)], B: [c(9), c(3)], C: [c(12), c(7)] })
    s = run(s, [
      ['A', { type: 'play', cards: [c(13)] }],
      ['B', { type: 'play', cards: [c(3)] }],
      ['C', { type: 'play', cards: [c(7)] }],
    ])
    expect(s.lastTrick!.holderId).toBe('A')
    expect(s.trick!.starterId).toBe('A')
    s = run(s, [
      ['A', { type: 'play', cards: [c(4)] }],
      ['B', { type: 'play', cards: [c(9)] }],
      ['C', { type: 'play', cards: [c(12)] }],
    ])
    expect(s.phase).toBe('over')
    expect(s.result).toEqual({ scores: { A: 4, B: 9, C: 12 }, finish: 1, lastTrickLeaderId: 'A' })
  })

  it('ends on a doffel when a set uses up the last cards', () => {
    let s = rigged({ A: [c(5), c(8)], B: [c(6), c(6, 1)], C: [c(2), c(14)] })
    s = run(s, [
      ['A', { type: 'play', cards: [c(5)] }],
      ['B', { type: 'play', cards: [c(6), c(6, 1)] }],
      ['C', { type: 'play', cards: [c(2), c(14)] }],
      ['A', { type: 'play', cards: [c(8)] }],
    ])
    expect(s.phase).toBe('over')
    expect(s.result).toEqual({ scores: { A: 13, B: 12, C: 16 }, finish: 2, lastTrickLeaderId: 'A' })
    expect(s.tricksWon.A).toBe(1)
  })

  it('keeps hands and choices out of the public view', () => {
    const s = newRound(seats, 4, seeded(8))
    const view = publicView(s) as Record<string, unknown>
    expect(view.hands).toBeUndefined()
    expect(view.deck).toBeUndefined()
    expect(view.discarding).toBeUndefined()
    expect(view.handSizes).toEqual({ A: 4, B: 4, C: 4 })
    expect(view.cardsLeft).toBe(40)
  })
})
