import { useEffect, useRef, useState } from 'react'
import type { Host } from '../../data/host'
import type { HandDoc, Lobby, Member } from '../../data/online'
import { newId, useStore } from '../../data/store'
import type { Action, GameProblem } from '../../domain/game/engine'

type Online = typeof import('../../data/online')

export type LobbyLoad = { status: 'loading' } | { status: 'missing' } | { status: 'error' } | { status: 'ok'; lobby: Lobby }

/** Most players at one table. Ten players still get five cards each. */
export const MAX_ONLINE = 10

const NAME_KEY = 'gursch.v1.onlineName'

export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Not essential: the name is asked for again next time.
  }
}

/**
 * Follows a lobby live: the public table, who has joined, and this player's
 * own hand. On the host's device it also runs the dealer.
 */
export function useLobby(code: string) {
  const uid = useStore((s) => s.playerUid)
  const [online, setOnline] = useState<Online | null>(null)
  const [load, setLoad] = useState<LobbyLoad>({ status: 'loading' })
  const [members, setMembers] = useState<Member[]>([])
  const [hand, setHand] = useState<HandDoc | null>(null)
  const [host, setHost] = useState<Host | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [problem, setProblem] = useState<GameProblem | null>(null)
  const [failed, setFailed] = useState(false)
  const lobbyRef = useRef<Lobby | null>(null)

  const lobby = load.status === 'ok' ? load.lobby : null
  lobbyRef.current = lobby
  const isHost = Boolean(lobby && uid && lobby.hostUid === uid)

  useEffect(() => {
    let cancelled = false
    const stops: (() => void)[] = []
    setLoad({ status: 'loading' })
    import('../../data/online')
      .then((mod) => {
        if (cancelled) return
        setOnline(mod)
        const fail = () => setLoad({ status: 'error' })
        stops.push(
          mod.watchLobby(code, (l) => setLoad(l ? { status: 'ok', lobby: l } : { status: 'missing' }), fail),
          mod.watchMembers(code, setMembers, fail),
        )
      })
      .catch(() => setLoad({ status: 'error' }))
    return () => {
      cancelled = true
      stops.forEach((stop) => stop())
    }
  }, [code])

  const seated = Boolean(uid && lobby?.seats.includes(uid) && lobby.status === 'playing')
  useEffect(() => {
    if (!online || !uid || !seated) return setHand(null)
    return online.watchHand(code, uid, setHand, () => setFailed(true))
  }, [online, code, uid, seated])

  // The host's device deals. It starts once the lobby is known and stops when the page closes.
  const ready = lobby !== null
  useEffect(() => {
    if (!isHost || !ready) return
    let cancelled = false
    let started: Host | null = null
    import('../../data/host')
      .then((mod) =>
        mod.startHost({
          lobby: lobbyRef.current!,
          saveSession: (s) => useStore.getState().repo.saveSession(s),
          newId,
          onError: () => setFailed(true),
        }),
      )
      .then((h) => {
        if (cancelled) return h.close()
        started = h
        setHost(h)
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      started?.close()
      setHost(null)
    }
  }, [isHost, ready, code])

  // A move is done when the host has acknowledged it in this player's hand.
  useEffect(() => {
    if (pending && hand?.ack === pending) {
      setPending(null)
      setProblem(hand.problem)
    }
  }, [hand, pending])

  async function submit(action: Action) {
    if (!uid || pending) return
    setProblem(null)
    setFailed(false)
    if (isHost) {
      if (host) setProblem(host.act(uid, action))
      return
    }
    if (!online) return
    const id = newId()
    setPending(id)
    try {
      await online.sendMove(code, uid, { id, action, at: Date.now() })
    } catch {
      setPending(null)
      setFailed(true)
    }
  }

  return {
    load,
    lobby,
    members,
    hand,
    uid,
    online,
    host,
    isHost,
    /** True while waiting for the host to carry out this player's move. */
    busy: pending !== null || (isHost && !host),
    problem,
    failed,
    setFailed,
    submit,
  }
}
