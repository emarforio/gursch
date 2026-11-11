import { describe, expect, it } from 'vitest'
import { dealCap, firstDeal, maxDeal, nextDeal } from './deal'
import { evaluateFormula, FormulaError, validateFormula } from './formula'
import { balances, roundAmount, settleUp } from './ledger'
import { clockwiseDistance, isValidScore, needsLastTrickLeader, resolveRound } from './scoring'
import type { Round } from './types'

const seats = ['a', 'b', 'c', 'd']

describe('scoring', () => {
  it('picks a clear winner and loser without a leader', () => {
    const scores = { a: 5, b: 2, c: 14, d: 9 }
    expect(needsLastTrickLeader(seats, scores)).toBe(false)
    expect(resolveRound(seats, scores)).toEqual({ winnerId: 'b', loserId: 'c' })
  })

  it('returns null when a tie needs the last trick leader', () => {
    const scores = { a: 3, b: 3, c: 10, d: 7 }
    expect(needsLastTrickLeader(seats, scores)).toBe(true)
    expect(resolveRound(seats, scores)).toBeNull()
  })

  it('counts distance clockwise only, not the shortest way round', () => {
    expect(clockwiseDistance(seats, 'c', 'c')).toBe(0)
    expect(clockwiseDistance(seats, 'c', 'd')).toBe(1)
    expect(clockwiseDistance(seats, 'c', 'a')).toBe(2)
    expect(clockwiseDistance(seats, 'c', 'b')).toBe(3)
  })

  it('gives a tied low score to the closest player clockwise', () => {
    // Leader c. b sits next to c but on the wrong side, so a (distance 2) beats b (distance 3).
    const scores = { a: 3, b: 3, c: 10, d: 7 }
    expect(resolveRound(seats, scores, 'c')).toEqual({ winnerId: 'a', loserId: 'c' })
  })

  it('gives a tied high score to the furthest player clockwise', () => {
    const scores = { a: 12, b: 12, c: 4, d: 12 }
    // From leader d: d=0, a=1, b=2.
    expect(resolveRound(seats, scores, 'd')).toEqual({ winnerId: 'c', loserId: 'b' })
    // The leader is closest, so the leader never loses a tie.
    expect(resolveRound(seats, scores, 'a')).toEqual({ winnerId: 'c', loserId: 'd' })
  })

  it('still finds one winner and one loser when everyone ties', () => {
    const scores = { a: 8, b: 8, c: 8, d: 8 }
    expect(resolveRound(seats, scores, 'b')).toEqual({ winnerId: 'b', loserId: 'a' })
  })

  it('validates score ranges per finish', () => {
    expect(isValidScore(14, 1)).toBe(true)
    expect(isValidScore(15, 1)).toBe(false)
    expect(isValidScore(1, 1)).toBe(false)
    expect(isValidScore(28, 2)).toBe(true)
    expect(isValidScore(3, 2)).toBe(false)
    expect(isValidScore(56, 4)).toBe(true)
  })
})

describe('deal', () => {
  it('computes the largest possible deal', () => {
    expect(maxDeal(5)).toBe(10)
    expect(maxDeal(6)).toBe(8)
    expect(maxDeal(2)).toBe(26)
  })

  it('uses the difference capped one below the max', () => {
    const rule = { mode: 'difference', capBelowMax: 1 } as const
    expect(dealCap(rule, 5)).toBe(9)
    expect(nextDeal(rule, 5, 3, 9)).toBe(6)
    expect(nextDeal(rule, 5, 2, 14)).toBe(9)
    expect(nextDeal(rule, 5, 7, 7)).toBe(1)
  })

  it('uses the loser score', () => {
    const rule = { mode: 'loserScore', capBelowMax: 0 } as const
    expect(nextDeal(rule, 5, 3, 9)).toBe(9)
    expect(nextDeal(rule, 5, 3, 14)).toBe(10)
    expect(nextDeal(rule, 6, 3, 28)).toBe(8)
  })

  it('supports a fixed deal and limits the first deal', () => {
    expect(nextDeal({ mode: 'fixed', fixed: 5, capBelowMax: 0 }, 4, 2, 14)).toBe(5)
    expect(firstDeal(6, 4)).toBe(6)
    expect(firstDeal(12, 6)).toBe(8)
  })
})

describe('formula', () => {
  const vars = { max_score: 12, min_score: 4, total: 30, players: 4 }

  it('evaluates the house formulas', () => {
    expect(evaluateFormula('(max_score - min_score) * 2', vars)).toBe(16)
    expect(evaluateFormula('max_score^2', vars)).toBe(144)
    expect(evaluateFormula('(max_score * min_score) / 100', vars)).toBe(0.48)
  })

  it('handles precedence, unary minus, functions and aliases', () => {
    expect(evaluateFormula('2 + 3 * 4', vars)).toBe(14)
    expect(evaluateFormula('-2^2', vars)).toBe(-4)
    expect(evaluateFormula('2^3^2', vars)).toBe(512)
    expect(evaluateFormula('round(total / players)', vars)).toBe(8)
    expect(evaluateFormula('MAX - min', vars)).toBe(8)
    expect(evaluateFormula('sqrt(abs(min_score - 20))', vars)).toBe(4)
    expect(evaluateFormula('0.1 + 0.2', vars)).toBe(0.3)
  })

  it('reports errors', () => {
    expect(validateFormula('(max_score - min_score) * 2')).toBeNull()
    expect(validateFormula('')).not.toBeNull()
    expect(validateFormula('max_score +')).not.toBeNull()
    expect(validateFormula('(max_score')).not.toBeNull()
    expect(validateFormula('foo * 2')).not.toBeNull()
    expect(validateFormula('alert(1)')).not.toBeNull()
    expect(validateFormula('2 $ 3')).not.toBeNull()
    expect(validateFormula('2 3')).not.toBeNull()
    expect(() => evaluateFormula('1 / (max_score - 12)', vars)).toThrow(FormulaError)
  })
})

describe('ledger', () => {
  const round = (winnerId: string, loserId: string, amount: number): Round => ({
    id: `${winnerId}${loserId}${amount}`,
    at: 0,
    seats,
    cardsDealt: 6,
    finish: 1,
    scores: {},
    winnerId,
    loserId,
    formula: '',
    amount,
  })

  it('computes the amount from the winner and loser scores', () => {
    const scores = { a: 5, b: 2, c: 14, d: 9 }
    expect(roundAmount('(max_score - min_score) * 2', seats, scores, 'b', 'c')).toBe(24)
    expect(roundAmount('total', seats, scores, 'b', 'c')).toBe(30)
  })

  it('keeps a running tab that sums to zero', () => {
    const bal = balances([round('a', 'b', 10), round('c', 'b', 6), round('b', 'a', 4)])
    expect(bal).toEqual({ a: 6, b: -12, c: 6, d: 0 })
  })

  it('settles with as few payments as the greedy pairing gives', () => {
    expect(settleUp({ a: 6, b: -12, c: 6, d: 0 })).toEqual([
      { from: 'b', to: 'a', amount: 6 },
      { from: 'b', to: 'c', amount: 6 },
    ])
    expect(settleUp({ a: 0, b: 0 })).toEqual([])
    const t = settleUp({ a: 10.5, b: -4.25, c: -6.25 })
    expect(t.reduce((s, x) => s + x.amount, 0)).toBe(10.5)
  })
})
