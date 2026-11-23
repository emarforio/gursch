/**
 * The dealer, run on the host's device while the lobby page is open. It holds
 * the full game, applies every player's moves through the game engine and
 * writes the results back. Loaded with a dynamic import, like online.ts.
 */
import { apply, GameError, newRound, publicView } from '../domain/game/engine'
import type { Action, GameProblem, GameState } from '../domain/game/engine'
import { maxDeal } from '../domain/deal'
import { roundAmount } from '../domain/ledger'
import { needsLastTrickLeader, resolveRound } from '../domain/scoring'
import { currentDeal } from '../domain/session'
import type { Round, Session } from '../domain/types'
import { commit, readSecret, updateLobby, watchMoves } from './online'
import type { HandDoc, Lobby, Member } from './online'

/** A random number in [0, 1) from the browser's cryptographic generator, for shuffling. */
function random(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32
}

type Deps = {
  lobby: Lobby
  /** Saves the session to the host's own history: the account or this device. */
  saveSession: (session: Session) => void
  newId: () => string
  onError: (e: unknown) => void
}

/**
 * The host is the only one who writes the lobby document, so it keeps its own
 * copy and never reads it back: a snapshot can arrive before the host's own
 * latest write and would bring back an older state.
 */
export type Host = {
  /** Changes the lobby before the game, such as the seating or the settings. */
  update(patch: Partial<Lobby>): Promise<void>
  /** A move by the host themselves. Returns the problem when the rules do not allow it. */
  act(uid: string, action: Action): GameProblem | null
  start(members: Member[], sessionName: string): Promise<void>
  nextRound(): Promise<void>
  end(): Promise<void>
  close(): void
}

export async function startHost(deps: Deps): Promise<Host> {
  let lobby = deps.lobby
  const id = lobby.id
  const secret = await readSecret(id)
  let state: GameState | null = secret.state
  const acks = { ...secret.acks }
  const problems: Record<string, GameProblem | null> = {}
  let written: Record<string, string> = {}
  // Writes go out one at a time and in order.
  let queue: Promise<unknown> = Promise.resolve()
  const enqueue = (write: () => Promise<unknown>) => {
    queue = queue.then(write).catch(deps.onError)
    return queue
  }

  function handDocs(): Record<string, HandDoc> {
    const out: Record<string, HandDoc> = {}
    if (!state) return out
    for (const uid of state.seats) {
      const hand: HandDoc = { cards: state.hands[uid] ?? [], ack: acks[uid] ?? null, problem: problems[uid] ?? null }
      const text = JSON.stringify(hand)
      if (written[uid] !== text) {
        out[uid] = hand
        written[uid] = text
      }
    }
    return out
  }

  /** Adds the round just finished to the scores, once. */
  function recordRound(): Session | null {
    const session = lobby.session
    if (!state?.result || !session || session.rounds.length >= lobby.round) return null
    const { scores, finish, lastTrickLeaderId } = state.result
    const seats = state.seats
    const outcome = resolveRound(seats, scores, lastTrickLeaderId)!
    let amount = 0
    try {
      amount = roundAmount(session.config.formula, seats, scores, outcome.winnerId, outcome.loserId)
    } catch {
      // A formula that fails for these scores counts as nothing owed.
    }
    const round: Round = {
      id: deps.newId(),
      at: Date.now(),
      seats,
      cardsDealt: state.cardsDealt,
      finish,
      scores,
      ...(needsLastTrickLeader(seats, scores) ? { lastTrickLeaderId } : {}),
      ...outcome,
      formula: session.config.formula,
      amount: Number.isFinite(amount) ? amount : 0,
    }
    return { ...session, rounds: [...session.rounds, round] }
  }

  function publish(extra: Partial<Lobby> = {}) {
    const session = recordRound()
    const patch: Partial<Lobby> = { game: state && publicView(state), ...extra, ...(session ? { session } : {}) }
    lobby = { ...lobby, ...patch }
    if (session) deps.saveSession(session)
    const hands = handDocs()
    const snapshot = { state, acks: { ...acks } }
    return enqueue(() => commit(id, { lobby: patch, hands, secret: snapshot }))
  }

  function act(uid: string, action: Action, moveId?: string): GameProblem | null {
    if (!state || lobby.status !== 'playing') return 'wrongPhase'
    let problem: GameProblem | null = null
    try {
      state = apply(state, uid, action, random)
    } catch (e) {
      if (!(e instanceof GameError)) throw e
      problem = e.problem
    }
    if (moveId) acks[uid] = moveId
    problems[uid] = problem
    void publish()
    return problem
  }

  const stop = watchMoves(
    id,
    (moves) => {
      for (const { uid, move } of moves) {
        if (acks[uid] === move.id) continue
        if (!state) {
          // Nothing to apply it to. Acknowledge it so the player is not left waiting.
          acks[uid] = move.id
          problems[uid] = 'wrongPhase'
          continue
        }
        act(uid, move.action, move.id)
      }
    },
    deps.onError,
  )

  return {
    async update(patch) {
      lobby = { ...lobby, ...patch }
      await enqueue(() => updateLobby(id, patch))
    },
    act: (uid, action) => act(uid, action),
    async start(members, sessionName) {
      const names = new Map(members.map((m) => [m.uid, m.name]))
      const seats = lobby.seats.filter((uid) => names.has(uid))
      if (seats.length < 2) return
      const now = Date.now()
      const session: Session = {
        id: deps.newId(),
        name: sessionName,
        createdAt: now,
        shared: false,
        config: { ...lobby.config, startCards: Math.min(lobby.config.startCards, maxDeal(seats.length)) },
        players: seats.map((uid) => ({ id: uid, name: names.get(uid)! })),
        seats,
        rounds: [],
      }
      deps.saveSession(session)
      state = newRound(seats, currentDeal(session), random)
      written = {}
      await publish({ status: 'playing', seats, session, round: 1 })
    },
    async nextRound() {
      const session = lobby.session
      if (!session || state?.phase !== 'over') return
      state = newRound(session.seats, currentDeal(session), random)
      await publish({ round: lobby.round + 1 })
    },
    async end() {
      const session = lobby.session
      if (session) {
        const ended = { ...session, endedAt: Date.now() }
        deps.saveSession(ended)
        lobby = { ...lobby, session: ended, status: 'closed' }
        await enqueue(() => updateLobby(id, { session: ended, status: 'closed', game: null }))
      } else {
        await enqueue(() => updateLobby(id, { status: 'closed' }))
      }
    },
    close: stop,
  }
}
