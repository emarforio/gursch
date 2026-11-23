import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sortCards } from '../domain/game/cards'
import type { Action } from '../domain/game/engine'
import { cardsToPlay } from '../domain/game/trick'
import { DEFAULT_CONFIG } from '../domain/types'
import type { Session } from '../domain/types'
import type { HandDoc, HostSecret, Lobby, Move } from './online'

// An in-memory stand-in for the Firestore documents the host reads and writes.
const db = vi.hoisted(() => ({
  lobby: null as unknown as Lobby,
  hands: {} as Record<string, HandDoc>,
  secret: null as HostSecret | null,
  onMoves: null as ((moves: { uid: string; move: Move }[]) => void) | null,
}))

vi.mock('./online', () => ({
  readSecret: async () => db.secret ?? { state: null, acks: {} },
  updateLobby: async (_id: string, patch: Partial<Lobby>) => void Object.assign(db.lobby, patch),
  commit: async (_id: string, change: { lobby?: Partial<Lobby>; hands?: Record<string, HandDoc>; secret?: HostSecret }) => {
    Object.assign(db.lobby, change.lobby ?? {})
    Object.assign(db.hands, change.hands ?? {})
    if (change.secret) db.secret = JSON.parse(JSON.stringify(change.secret))
  },
  watchMoves: (_id: string, cb: (moves: { uid: string; move: Move }[]) => void) => {
    db.onMoves = cb
    return () => (db.onMoves = null)
  },
}))

const { startHost } = await import('./host')

let ids = 0
const newId = () => `id${++ids}`
const flush = () => new Promise((r) => setTimeout(r, 0))
const members = [
  { uid: 'host', name: 'Hanna', joinedAt: 1 },
  { uid: 'bo', name: 'Bo', joinedAt: 2 },
]

/** A player's move arriving through their move document. */
function send(uid: string, action: Action): string {
  const id = newId()
  db.onMoves!([{ uid, move: { id, action, at: Date.now() } }])
  return id
}

beforeEach(() => {
  db.lobby = { id: 'abc', hostUid: 'host', status: 'open', createdAt: 0, config: DEFAULT_CONFIG, seats: ['host', 'bo'], session: null, round: 0, game: null }
  db.hands = {}
  db.secret = null
})

describe('the host', () => {
  it('deals, carries out moves, and records the round in the scores', async () => {
    const saved: Session[] = []
    const host = await startHost({ lobby: { ...db.lobby }, saveSession: (s) => saved.push(s), newId, onError: (e) => { throw e } })
    await host.start(members, 'Today')
    await flush()

    expect(db.lobby.status).toBe('playing')
    expect(db.lobby.round).toBe(1)
    expect(db.hands.host!.cards).toHaveLength(6)
    expect(db.hands.bo!.cards).toHaveLength(6)
    expect(JSON.stringify(db.lobby.game)).not.toContain('"hands"')

    // A move the rules do not allow is acknowledged with the reason.
    const bad = send('bo', { type: 'play', cards: [db.hands.bo!.cards[0]!] })
    await flush()
    expect(db.hands.bo).toMatchObject({ ack: bad, problem: 'wrongPhase' })

    // Play the round through: no trade, everyone ready, then the lowest cards each turn.
    const game = () => db.lobby.game!
    const actor = (uid: string, action: Action) => (uid === 'host' ? host.act(uid, action) : (send(uid, action), null))
    actor(game().leaderId, { type: 'chooseTrade', count: 0 })
    await flush()
    actor('host', { type: 'ready' })
    actor('bo', { type: 'ready' })
    await flush()
    for (let i = 0; game().phase === 'play'; i++) {
      expect(i).toBeLessThan(50)
      const turn = game().trick!.turnId!
      const n = Math.max(1, cardsToPlay(game().trick!, turn))
      expect(actor(turn, { type: 'play', cards: sortCards(db.hands[turn]!.cards).slice(0, n) })).toBeNull()
      await flush()
    }

    expect(game().phase).toBe('over')
    const session = db.lobby.session!
    expect(session.rounds).toHaveLength(1)
    expect(session.players.map((p) => p.name)).toEqual(['Hanna', 'Bo'])
    const round = session.rounds[0]!
    expect(round.amount).toBe((round.scores[round.loserId]! - round.scores[round.winnerId]!) * 2)
    expect(saved.at(-1)!.rounds).toHaveLength(1)

    // A late move does not record the round twice.
    send('bo', { type: 'ready' })
    await flush()
    expect(db.lobby.session!.rounds).toHaveLength(1)

    await host.nextRound()
    expect(db.lobby.round).toBe(2)
    expect(db.lobby.game!.phase).not.toBe('over')
    await host.end()
    expect(db.lobby.status).toBe('closed')
    expect(saved.at(-1)!.endedAt).toBeDefined()
    host.close()
  })

  it('picks up a game after the host reloads the page', async () => {
    const first = await startHost({ lobby: { ...db.lobby }, saveSession: () => {}, newId, onError: (e) => { throw e } })
    await first.start(members, 'Today')
    const moveId = send('bo', { type: 'throw' })
    await flush()
    first.close()

    const again = await startHost({ lobby: JSON.parse(JSON.stringify(db.lobby)), saveSession: () => {}, newId, onError: (e) => { throw e } })
    const before = JSON.stringify(db.lobby.game)
    // The same move arriving again after the reload is not carried out twice.
    db.onMoves!([{ uid: 'bo', move: { id: moveId, action: { type: 'throw' }, at: 0 } }])
    await flush()
    expect(JSON.stringify(db.lobby.game)).toBe(before)
    expect(again.act(db.lobby.game!.leaderId, { type: 'chooseTrade', count: 0 })).toBeNull()
    again.close()
  })
})
