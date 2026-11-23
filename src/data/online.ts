/**
 * Lobbies for playing online. Imports the Firebase SDK, so like firebase.ts it
 * is only loaded with a dynamic import.
 *
 * There is no server: the host's device is the dealer. It keeps the whole game
 * in a document only the host can read, gives each player their own hand in a
 * document only that player (and the host) can read, and publishes everything
 * else in the lobby document. Players send their moves to the host through a
 * document of their own, which only they and the host can read.
 *
 * Firestore layout:
 *   lobbies/{code}               Lobby: public state, readable by anyone with the code
 *   lobbies/{code}/members/{uid} Member: who has joined
 *   lobbies/{code}/hands/{uid}   HandDoc: one player's cards, written by the host
 *   lobbies/{code}/moves/{uid}   Move: the player's latest move, read by the host
 *   lobbies/{code}/secret/game   HostSecret: the full game, host only
 */
import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import type { Card } from '../domain/game/cards'
import type { Action, GameProblem, GameState, PublicGame } from '../domain/game/engine'
import type { Session, SessionConfig } from '../domain/types'
import { db, playerUid } from './firebase'

export type LobbyStatus = 'open' | 'playing' | 'closed'

export type Lobby = {
  id: string
  hostUid: string
  status: LobbyStatus
  createdAt: number
  config: SessionConfig
  /** Member ids clockwise. Arranged by the host before the game starts. */
  seats: string[]
  /** The scores so far. Set when the game starts. */
  session: Session | null
  /** Number of the round being played, from 1. */
  round: number
  game: PublicGame | null
}

export type Member = { uid: string; name: string; joinedAt: number }

export type HandDoc = {
  cards: Card[]
  /** Id of the last move of this player the host has handled. */
  ack: string | null
  /** Why that move was refused, or null when it was carried out. */
  problem: GameProblem | null
}

export type Move = { id: string; action: Action; at: number }

export type HostSecret = { state: GameState | null; acks: Record<string, string> }

/** Letters and digits that cannot be mistaken for each other. */
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'
export const CODE_LENGTH = 6

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
}

const lobbyDoc = (id: string) => doc(db, 'lobbies', id)
const memberDoc = (id: string, uid: string) => doc(db, 'lobbies', id, 'members', uid)
const handDoc = (id: string, uid: string) => doc(db, 'lobbies', id, 'hands', uid)
const moveDoc = (id: string, uid: string) => doc(db, 'lobbies', id, 'moves', uid)
const secretDoc = (id: string) => doc(db, 'lobbies', id, 'secret', 'game')

export { playerUid }

export async function createLobby(name: string, config: SessionConfig): Promise<string> {
  const uid = await playerUid()
  const id = newCode()
  const lobby: Lobby = { id, hostUid: uid, status: 'open', createdAt: Date.now(), config, seats: [uid], session: null, round: 0, game: null }
  await setDoc(lobbyDoc(id), lobby)
  await setDoc(memberDoc(id, uid), { uid, name, joinedAt: Date.now() } satisfies Member)
  return id
}

export async function joinLobby(id: string, name: string): Promise<void> {
  const uid = await playerUid()
  await setDoc(memberDoc(id, uid), { uid, name, joinedAt: Date.now() } satisfies Member)
}

/** Leaves the lobby, or with another uid, the host removes that member. */
export async function removeMember(id: string, uid: string): Promise<void> {
  await deleteDoc(memberDoc(id, uid))
}

export function watchLobby(id: string, cb: (lobby: Lobby | null) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(lobbyDoc(id), (snap) => cb(snap.exists() ? (snap.data() as Lobby) : null), onError)
}

export function watchMembers(id: string, cb: (members: Member[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    collection(db, 'lobbies', id, 'members'),
    (snap) => cb(snap.docs.map((d) => d.data() as Member).sort((a, b) => a.joinedAt - b.joinedAt)),
    onError,
  )
}

export function watchHand(id: string, uid: string, cb: (hand: HandDoc | null) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(handDoc(id, uid), (snap) => cb(snap.exists() ? (snap.data() as HandDoc) : null), onError)
}

export async function sendMove(id: string, uid: string, move: Move): Promise<void> {
  await setDoc(moveDoc(id, uid), move)
}

// Host only from here on.

export function watchMoves(id: string, cb: (moves: { uid: string; move: Move }[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    collection(db, 'lobbies', id, 'moves'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, move: d.data() as Move }))),
    onError,
  )
}

export async function updateLobby(id: string, patch: Partial<Lobby>): Promise<void> {
  await updateDoc(lobbyDoc(id), patch)
}

export async function readSecret(id: string): Promise<HostSecret> {
  const snap = await getDoc(secretDoc(id))
  return snap.exists() ? (snap.data() as HostSecret) : { state: null, acks: {} }
}

/** Writes a change of the game in one go, so players never see the lobby and their hands disagree. */
export async function commit(id: string, change: { lobby?: Partial<Lobby>; hands?: Record<string, HandDoc>; secret?: HostSecret }) {
  const batch = writeBatch(db)
  if (change.lobby) batch.update(lobbyDoc(id), change.lobby)
  for (const [uid, hand] of Object.entries(change.hands ?? {})) batch.set(handDoc(id, uid), hand)
  if (change.secret) batch.set(secretDoc(id), change.secret)
  await batch.commit()
}
