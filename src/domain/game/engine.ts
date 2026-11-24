import type { Finish, Scores } from '../types'
import { allInHand, DECK, isWeakHand, shuffle, valueOf, without } from './cards'
import type { Card } from './cards'
import { applyPlay, cardsToPlay, checkPlay, startTrick } from './trick'
import type { PlayProblem, Trick } from './trick'

/**
 * One round of Gursch, from the deal to the last trick. The state is plain
 * data so it can be stored as it is. `apply` checks a player's action against
 * the rules and returns the next state; it never changes the state it is given.
 *
 * Phases:
 *   firstTrade   the leader chooses how many cards everyone trades; a weak hand may be thrown
 *   firstDiscard everyone picks the cards to discard
 *   openTrade    anyone may suggest an open trade; play starts when everyone is ready
 *   openVote     everyone has to agree to the suggested open trade
 *   openTake     everyone picks which of their face-up cards to take, and what to discard for them
 *   play         tricks
 *   over         the last trick has been played
 */
export type Phase = 'firstTrade' | 'firstDiscard' | 'openTrade' | 'openVote' | 'openTake' | 'play' | 'over'

export type OpenTrade = {
  proposerId: string
  count: number
  accepted: string[]
  /** The face-up cards dealt to each player, once everyone has agreed. */
  offered: Record<string, Card[]>
}

export type RoundResult = {
  scores: Scores
  finish: Finish
  /** Who started the last trick. Ties are decided by distance from them. */
  lastTrickLeaderId: string
}

export type GameState = {
  /** Player ids clockwise. */
  seats: string[]
  cardsDealt: number
  phase: Phase
  /** Cards still to be drawn. The top of the deck is the end of the array. */
  deck: Card[]
  discard: Card[]
  hands: Record<string, Card[]>
  /** Cards in each hand that everyone has seen: the face-up card of the deal and cards taken in an open trade. */
  known: Record<string, Card[]>
  leaderId: string
  /** Extra face-up cards dealt to pick the leader, one record per draw. Empty when the deal decided it. */
  leaderDraws: Record<string, Card>[]
  /** Hands thrown as weak, shown to everyone. */
  thrown: { playerId: string; cards: Card[] }[]
  /** How many cards the leader said everyone trades in the first trade. */
  tradeCount: number | null
  /** Secret choices while waiting for everyone: cards to discard in the first trade or an open trade. */
  discarding: Record<string, Card[]>
  /** Secret choices in an open trade: which face-up cards to take. */
  taking: Record<string, Card[]>
  /** Players who are ready to start playing. */
  ready: string[]
  open: OpenTrade | null
  /** Who refused the last suggested open trade. */
  refusedBy: string | null
  trick: Trick | null
  lastTrick: Trick | null
  /** Every finished trick of this round, oldest first. */
  tricks: Trick[]
  tricksWon: Record<string, number>
  result: RoundResult | null
}

export type Action =
  | { type: 'throw' }
  | { type: 'chooseTrade'; count: number }
  | { type: 'discard'; cards: Card[] }
  | { type: 'ready' }
  | { type: 'propose'; count: number }
  | { type: 'vote'; accept: boolean }
  | { type: 'take'; take: Card[]; discard: Card[] }
  | { type: 'play'; cards: Card[] }

export type GameProblem =
  | PlayProblem
  | 'wrongPhase'
  | 'notSeated'
  | 'notLeader'
  | 'notWeak'
  | 'badCount'
  | 'alreadyDone'
  | 'notOffered'

export class GameError extends Error {
  constructor(readonly problem: GameProblem) {
    super(problem)
  }
}

type Random = () => number

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/** Seats clockwise starting with the given player. */
export function fromSeat(seats: string[], firstId: string): string[] {
  const i = seats.indexOf(firstId)
  return [...seats.slice(i), ...seats.slice(0, i)]
}

/** Draws the top card, shuffling the discard pile into a new deck when the deck runs out. */
function draw(s: GameState, random: Random): Card | null {
  if (s.deck.length === 0) {
    s.deck = shuffle(s.discard, random)
    s.discard = []
  }
  return s.deck.pop() ?? null
}

function drawMany(s: GameState, n: number, random: Random): Card[] {
  const out: Card[] = []
  for (let i = 0; i < n; i++) {
    const c = draw(s, random)
    if (c !== null) out.push(c)
  }
  return out
}

/** Players with the highest value among the given cards. */
function highest(cards: Record<string, Card>, among: string[]): string[] {
  const top = Math.max(...among.map((id) => valueOf(cards[id]!)))
  return among.filter((id) => valueOf(cards[id]!) === top)
}

/**
 * Deals a new round. The last card to each player is face up and the highest
 * one makes its holder the leader; ties are broken with extra face-up cards.
 * With one card each the cards are face down and the extra cards decide.
 */
export function newRound(seats: string[], cardsDealt: number, random: Random): GameState {
  if (seats.length < 2) throw new Error('A round needs at least two players')
  if (cardsDealt < 1 || cardsDealt * seats.length > DECK.length) throw new Error('Cannot deal that many cards')

  const s: GameState = {
    seats: [...seats],
    cardsDealt,
    phase: 'firstTrade',
    deck: shuffle(DECK, random),
    discard: [],
    hands: Object.fromEntries(seats.map((id) => [id, []])),
    known: Object.fromEntries(seats.map((id) => [id, []])),
    leaderId: seats[0]!,
    leaderDraws: [],
    thrown: [],
    tradeCount: null,
    discarding: {},
    taking: {},
    ready: [],
    open: null,
    refusedBy: null,
    trick: null,
    lastTrick: null,
    tricks: [],
    tricksWon: Object.fromEntries(seats.map((id) => [id, 0])),
    result: null,
  }

  for (let i = 0; i < cardsDealt; i++) {
    for (const id of seats) s.hands[id]!.push(s.deck.pop()!)
  }

  let contenders = [...seats]
  if (cardsDealt > 1) {
    const faceUp = Object.fromEntries(seats.map((id) => [id, s.hands[id]!.at(-1)!]))
    for (const id of seats) s.known[id] = [faceUp[id]!]
    contenders = highest(faceUp, seats)
  }
  // One card each always needs an extra card to pick the leader; a tie on the face-up cards needs one too.
  // The extra cards stay aside until the leader is decided, so the same tied cards are never drawn again.
  const extras: Card[] = []
  while (cardsDealt === 1 ? s.leaderDraws.length === 0 || contenders.length > 1 : contenders.length > 1) {
    if (s.deck.length + s.discard.length < contenders.length) break
    const extra: Record<string, Card> = {}
    for (const id of contenders) extra[id] = draw(s, random)!
    extras.push(...Object.values(extra))
    s.leaderDraws.push(extra)
    contenders = highest(extra, contenders)
  }
  s.discard.push(...extras)
  // Only if the deck ran dry: the first of the tied players in seat order leads.
  s.leaderId = contenders[0]!

  // With one or two cards there is no first trade. With one card there is no open trade either,
  // but everyone looks at their card and says they are ready before the cards are shown.
  if (cardsDealt <= 2) toOpenTrade(s)
  return s
}

function toOpenTrade(s: GameState) {
  s.phase = 'openTrade'
  s.ready = []
  s.open = null
  s.discarding = {}
  s.taking = {}
}

function startPlay(s: GameState) {
  s.phase = 'play'
  s.ready = []
  s.trick = startTrick(s.seats, s.leaderId)
  playForced(s)
}

function play(s: GameState, playerId: string, cards: Card[]) {
  s.trick = applyPlay(s.trick!, s.seats, playerId, cards)
  s.hands[playerId] = without(s.hands[playerId]!, cards)
  forget(s, playerId, cards)
  if (s.trick.turnId === null) finishTrick(s)
}

/**
 * Plays for each player in turn who has no choice: the cards they must play
 * are their whole hand, such as their last card. That play is always allowed.
 */
function playForced(s: GameState) {
  while (s.phase === 'play' && s.trick?.turnId) {
    const id = s.trick.turnId
    const hand = s.hands[id]!
    if (hand.length !== cardsToPlay(s.trick, id)) return
    play(s, id, [...hand])
  }
}

/** The largest open trade the cards allow: no more than the hand, and enough cards for everyone. */
export function maxOpenTrade(s: Pick<GameState, 'seats' | 'cardsDealt'> & { cardsLeft: number }): number {
  // A single card is dealt face down and cannot be traded.
  if (s.cardsDealt === 1) return 0
  return Math.min(s.cardsDealt, Math.floor(s.cardsLeft / s.seats.length))
}

function forget(s: GameState, id: string, cards: Card[]) {
  s.known[id] = without(s.known[id]!, cards)
}

function firstTrade(s: GameState, random: Random) {
  const n = s.tradeCount!
  for (const id of s.seats) {
    const out = s.discarding[id] ?? []
    s.hands[id] = without(s.hands[id]!, out)
    s.discard.push(...out)
    forget(s, id, out)
  }
  // New cards are dealt one player at a time, starting with the leader.
  for (const id of fromSeat(s.seats, s.leaderId)) s.hands[id]!.push(...drawMany(s, n, random))
  toOpenTrade(s)
}

function openTrade(s: GameState) {
  for (const id of s.seats) {
    const take = s.taking[id] ?? []
    const out = s.discarding[id] ?? []
    s.hands[id] = [...without(s.hands[id]!, out), ...take]
    forget(s, id, out)
    s.known[id]!.push(...take)
    s.discard.push(...out, ...without(s.open!.offered[id]!, take))
  }
  s.refusedBy = null
  toOpenTrade(s)
}

function finishTrick(s: GameState) {
  const trick = s.trick!
  s.tricksWon[trick.holderId]! += 1
  s.lastTrick = trick
  // Games saved before the history was kept have no list yet.
  s.tricks = [...(s.tricks ?? []), trick]
  s.trick = null
  if (s.hands[s.seats[0]!]!.length > 0) {
    s.trick = startTrick(s.seats, trick.holderId)
    return
  }
  const scores: Scores = {}
  for (const id of s.seats) scores[id] = trick.plays[id]!.reduce((sum, c) => sum + valueOf(c), 0)
  s.result = { scores, finish: trick.required as Finish, lastTrickLeaderId: trick.starterId }
  s.phase = 'over'
}

/** The state after one player's action. Throws GameError when the rules do not allow it. */
export function apply(state: GameState, playerId: string, action: Action, random: Random): GameState {
  if (!state.seats.includes(playerId)) throw new GameError('notSeated')
  const s = clone(state)
  const hand = s.hands[playerId]!
  const need = (phase: Phase) => {
    if (s.phase !== phase) throw new GameError('wrongPhase')
  }

  switch (action.type) {
    case 'throw': {
      need('firstTrade')
      if (!isWeakHand(hand)) throw new GameError('notWeak')
      s.thrown.push({ playerId, cards: hand })
      s.discard.push(...hand)
      s.known[playerId] = []
      s.hands[playerId] = drawMany(s, s.cardsDealt, random)
      return s
    }

    case 'chooseTrade': {
      need('firstTrade')
      if (playerId !== s.leaderId) throw new GameError('notLeader')
      const n = action.count
      if (!Number.isInteger(n) || n < 0 || n > s.cardsDealt) throw new GameError('badCount')
      s.tradeCount = n
      s.discarding = {}
      if (n === 0) {
        toOpenTrade(s)
      } else if (n === s.cardsDealt) {
        // Nothing to choose: everyone trades the whole hand.
        for (const id of s.seats) s.discarding[id] = [...s.hands[id]!]
        firstTrade(s, random)
      } else {
        s.phase = 'firstDiscard'
      }
      return s
    }

    case 'discard': {
      need('firstDiscard')
      if (action.cards.length !== s.tradeCount) throw new GameError('badCount')
      if (!allInHand(hand, action.cards)) throw new GameError('notInHand')
      s.discarding[playerId] = [...action.cards]
      if (s.seats.every((id) => s.discarding[id])) firstTrade(s, random)
      return s
    }

    case 'ready': {
      need('openTrade')
      if (!s.ready.includes(playerId)) s.ready.push(playerId)
      if (s.seats.every((id) => s.ready.includes(id))) startPlay(s)
      return s
    }

    case 'propose': {
      need('openTrade')
      const max = maxOpenTrade({ ...s, cardsLeft: s.deck.length + s.discard.length })
      if (!Number.isInteger(action.count) || action.count < 1 || action.count > max) throw new GameError('badCount')
      s.open = { proposerId: playerId, count: action.count, accepted: [playerId], offered: {} }
      s.refusedBy = null
      s.ready = []
      s.phase = 'openVote'
      return s
    }

    case 'vote': {
      need('openVote')
      const open = s.open!
      if (open.accepted.includes(playerId)) throw new GameError('alreadyDone')
      if (!action.accept) {
        s.refusedBy = playerId
        toOpenTrade(s)
        return s
      }
      open.accepted.push(playerId)
      if (s.seats.every((id) => open.accepted.includes(id))) {
        // The new cards are dealt face up to everyone, starting with the leader, before anyone discards.
        for (const id of fromSeat(s.seats, s.leaderId)) open.offered[id] = drawMany(s, open.count, random)
        s.discarding = {}
        s.taking = {}
        s.phase = 'openTake'
      }
      return s
    }

    case 'take': {
      need('openTake')
      if (s.discarding[playerId]) throw new GameError('alreadyDone')
      const { take, discard } = action
      if (take.length !== discard.length) throw new GameError('badCount')
      if (!allInHand(s.open!.offered[playerId]!, take)) throw new GameError('notOffered')
      if (!allInHand(hand, discard)) throw new GameError('notInHand')
      s.taking[playerId] = [...take]
      s.discarding[playerId] = [...discard]
      if (s.seats.every((id) => s.discarding[id])) openTrade(s)
      return s
    }

    case 'play': {
      need('play')
      const trick = s.trick!
      const problem = checkPlay(trick, playerId, hand, action.cards)
      if (problem) throw new GameError(problem)
      play(s, playerId, action.cards)
      playForced(s)
      return s
    }
  }
}

/** What every player may see: everything except the hands, the deck order and the secret choices. */
export type PublicGame = Omit<GameState, 'deck' | 'discard' | 'hands' | 'discarding' | 'taking'> & {
  cardsLeft: number
  handSizes: Record<string, number>
  /** Who has made their secret choice in the current phase. */
  chosen: string[]
}

export function publicView(s: GameState): PublicGame {
  const { deck, discard, hands, discarding, taking: _taking, ...rest } = s
  return {
    ...clone(rest),
    cardsLeft: deck.length + discard.length,
    handSizes: Object.fromEntries(s.seats.map((id) => [id, hands[id]!.length])),
    chosen: s.seats.filter((id) => discarding[id]),
  }
}
