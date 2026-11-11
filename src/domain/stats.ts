import { balances } from './ledger'
import { extremes } from './scoring'
import type { Finish, Round, Session } from './types'

export type PlayerStats = {
  id: string
  sessions: number
  /** Sessions finished with the highest positive balance. */
  sessionsWon: number
  rounds: number
  wins: number
  losses: number
  /** Average final card over single-card rounds. */
  average: number | null
  net: number
  moneyWon: number
  moneyLost: number
  biggestWin: number
  biggestLoss: number
  longestWinStreak: number
  longestLossStreak: number
  /** Single-card rounds finished on an ace or on a 2. */
  aces: number
  twos: number
  /** Ties for lowest or highest that went this player's way, and against. */
  tiesWon: number
  tiesLost: number
  /** How often each final card value (2-14) occurred in single-card rounds. */
  cards: Record<number, number>
}

/** Money and rounds between two players: how often and how much `loser` paid `winner`. */
export type Pairing = { winnerId: string; loserId: string; count: number; amount: number }

export type RecordRound = { round: Round; sessionId: string }

export type Stats = {
  sessions: number
  rounds: number
  players: PlayerStats[]
  pairings: Pairing[]
  biggestAmount: RecordRound | null
  largestDiff: RecordRound | null
  averageAmount: number | null
  /** Average of the loser's score minus the winner's, single-card rounds only. */
  averageDiff: number | null
  averageCards: number | null
  commonDeal: number | null
  finishes: Record<Finish, number>
  tieBreaks: number
  /** Running balance per player after each round, starting from 0. */
  timeline: { ids: string[]; points: Record<string, number>[] }
}

function emptyPlayer(id: string): PlayerStats {
  return {
    id,
    sessions: 0,
    sessionsWon: 0,
    rounds: 0,
    wins: 0,
    losses: 0,
    average: null,
    net: 0,
    moneyWon: 0,
    moneyLost: 0,
    biggestWin: 0,
    biggestLoss: 0,
    longestWinStreak: 0,
    longestLossStreak: 0,
    aces: 0,
    twos: 0,
    tiesWon: 0,
    tiesLost: 0,
    cards: {},
  }
}

const diffOf = (r: Round) => r.scores[r.loserId]! - r.scores[r.winnerId]!

export function computeStats(sessions: Session[]): Stats {
  const ordered = [...sessions].sort((a, b) => a.createdAt - b.createdAt)
  const players = new Map<string, PlayerStats>()
  const get = (id: string) => {
    let p = players.get(id)
    if (!p) players.set(id, (p = emptyPlayer(id)))
    return p
  }
  const pairings = new Map<string, Pairing>()
  const streak = new Map<string, { win: number; loss: number }>()
  const singles = new Map<string, { sum: number; n: number }>()
  const deals = new Map<number, number>()
  const finishes: Record<Finish, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const running: Record<string, number> = {}
  const points: Record<string, number>[] = []
  let rounds = 0
  let amountSum = 0
  let cardsSum = 0
  let diffSum = 0
  let diffCount = 0
  let tieBreaks = 0
  let biggestAmount: RecordRound | null = null
  let largestDiff: RecordRound | null = null

  for (const session of ordered) {
    if (session.rounds.length === 0) continue
    const took = new Set(session.rounds.flatMap((r) => r.seats))
    for (const id of took) {
      get(id).sessions++
      running[id] ??= 0
    }
    const bal = balances(session.rounds)
    const top = Math.max(...Object.values(bal))
    if (top > 0) for (const [id, v] of Object.entries(bal)) if (v === top) get(id).sessionsWon++

    for (const round of session.rounds) {
      rounds++
      amountSum += round.amount
      cardsSum += round.cardsDealt
      deals.set(round.cardsDealt, (deals.get(round.cardsDealt) ?? 0) + 1)
      finishes[round.finish]++
      const ref = { round, sessionId: session.id }
      if (!biggestAmount || round.amount > biggestAmount.round.amount) biggestAmount = ref
      if (round.finish === 1) {
        diffSum += diffOf(round)
        diffCount++
        if (!largestDiff || diffOf(round) > diffOf(largestDiff.round)) largestDiff = ref
      }

      const { lowest, highest } = extremes(round.seats, round.scores)
      if (lowest.length > 1 || highest.length > 1) tieBreaks++

      for (const id of round.seats) {
        const p = get(id)
        const s = streak.get(id) ?? { win: 0, loss: 0 }
        streak.set(id, s)
        p.rounds++
        const won = id === round.winnerId
        const lost = id === round.loserId
        s.win = won ? s.win + 1 : 0
        s.loss = lost ? s.loss + 1 : 0
        p.longestWinStreak = Math.max(p.longestWinStreak, s.win)
        p.longestLossStreak = Math.max(p.longestLossStreak, s.loss)
        if (won) {
          p.wins++
          p.moneyWon += round.amount
          p.biggestWin = Math.max(p.biggestWin, round.amount)
        }
        if (lost) {
          p.losses++
          p.moneyLost += round.amount
          p.biggestLoss = Math.max(p.biggestLoss, round.amount)
        }
        if (lowest.length > 1 && lowest.includes(id)) won ? p.tiesWon++ : p.tiesLost++
        if (highest.length > 1 && highest.includes(id)) lost ? p.tiesLost++ : p.tiesWon++
        if (round.finish === 1) {
          const score = round.scores[id]!
          const agg = singles.get(id) ?? { sum: 0, n: 0 }
          singles.set(id, { sum: agg.sum + score, n: agg.n + 1 })
          p.cards[score] = (p.cards[score] ?? 0) + 1
          if (score === 14) p.aces++
          if (score === 2) p.twos++
        }
      }

      const key = `${round.winnerId}<${round.loserId}`
      const pair = pairings.get(key) ?? { winnerId: round.winnerId, loserId: round.loserId, count: 0, amount: 0 }
      pairings.set(key, { ...pair, count: pair.count + 1, amount: pair.amount + round.amount })

      running[round.winnerId] = (running[round.winnerId] ?? 0) + round.amount
      running[round.loserId] = (running[round.loserId] ?? 0) - round.amount
      points.push({ ...running })
    }
  }

  for (const p of players.values()) {
    const agg = singles.get(p.id)
    p.average = agg ? agg.sum / agg.n : null
    p.net = p.moneyWon - p.moneyLost
  }

  const commonDeal = [...deals.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null

  return {
    sessions: ordered.filter((s) => s.rounds.length > 0).length,
    rounds,
    players: [...players.values()].sort((a, b) => b.net - a.net || b.wins - a.wins),
    pairings: [...pairings.values()].sort((a, b) => b.amount - a.amount || b.count - a.count),
    biggestAmount,
    largestDiff,
    averageAmount: rounds ? amountSum / rounds : null,
    averageDiff: diffCount ? diffSum / diffCount : null,
    averageCards: rounds ? cardsSum / rounds : null,
    commonDeal,
    finishes,
    tieBreaks,
    timeline: { ids: Object.keys(running), points },
  }
}
