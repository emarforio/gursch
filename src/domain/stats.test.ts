import { describe, expect, it } from 'vitest'
import { computeStats } from './stats'
import type { Finish, Round, Session } from './types'

const seats = ['a', 'b', 'c']
let n = 0
function round(scores: Record<string, number>, winnerId: string, loserId: string, amount: number, finish: Finish = 1): Round {
  return { id: `r${n++}`, at: n, seats, cardsDealt: 6, finish, scores, winnerId, loserId, formula: '', amount }
}
function session(id: string, createdAt: number, rounds: Round[]): Session {
  return {
    id,
    name: id,
    createdAt,
    shared: false,
    config: { startCards: 6, dealRule: { mode: 'difference', capBelowMax: 1 }, formula: '' },
    players: seats.map((s) => ({ id: s, name: s })),
    seats,
    rounds,
  }
}

const s1 = session('s1', 1, [
  round({ a: 2, b: 9, c: 14 }, 'a', 'c', 24),
  round({ a: 3, b: 3, c: 10 }, 'a', 'c', 14), // tie for lowest, a won it
  round({ a: 20, b: 8, c: 12 }, 'b', 'a', 24, 2), // doffel finish
])
const s2 = session('s2', 2, [round({ a: 14, b: 5, c: 2 }, 'c', 'a', 24)])

describe('computeStats', () => {
  const stats = computeStats([s2, s1, session('empty', 3, [])])
  const p = (id: string) => stats.players.find((x) => x.id === id)!

  it('counts sessions and rounds, ignoring empty sessions', () => {
    expect(stats.sessions).toBe(2)
    expect(stats.rounds).toBe(4)
    expect(stats.finishes).toEqual({ 1: 3, 2: 1, 3: 0, 4: 0 })
    expect(stats.tieBreaks).toBe(1)
    expect(stats.commonDeal).toBe(6)
  })

  it('computes per-player results', () => {
    expect(p('a')).toMatchObject({ rounds: 4, wins: 2, losses: 2, net: -10, moneyWon: 38, moneyLost: 48 })
    expect(p('a')).toMatchObject({ longestWinStreak: 2, longestLossStreak: 2, aces: 1, twos: 1, tiesWon: 1, tiesLost: 0 })
    expect(p('b')).toMatchObject({ wins: 1, losses: 0, net: 24, tiesLost: 1 })
    expect(p('c')).toMatchObject({ wins: 1, losses: 2, net: -14, biggestLoss: 24, aces: 1 })
  })

  it('averages single-card rounds only', () => {
    expect(p('a').average).toBeCloseTo((2 + 3 + 14) / 3)
    expect(p('a').cards).toEqual({ 2: 1, 3: 1, 14: 1 })
  })

  it('finds session winners, records and pairings', () => {
    expect(p('b').sessionsWon).toBe(1) // s1: a +14, b +24, c -38
    expect(p('c').sessionsWon).toBe(1) // s2
    expect(p('a').sessionsWon).toBe(0)
    expect(stats.largestDiff?.round.scores).toEqual({ a: 2, b: 9, c: 14 })
    expect(stats.averageDiff).toBeCloseTo((12 + 7 + 12) / 3)
    expect(stats.pairings[0]).toEqual({ winnerId: 'a', loserId: 'c', count: 2, amount: 38 })
  })

  it('builds a running balance in chronological order that sums to zero', () => {
    expect(stats.timeline.points).toHaveLength(4)
    expect(stats.timeline.points[0]).toEqual({ a: 24, b: 0, c: -24 })
    expect(stats.timeline.points[3]).toEqual({ a: -10, b: 24, c: -14 })
  })

  it('orders players by net', () => {
    expect(stats.players.map((x) => x.id)).toEqual(['b', 'a', 'c'])
  })
})
