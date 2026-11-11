import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIG } from '../domain/types'
import type { Player, Session } from '../domain/types'
import { importLocal, pendingImport } from './migrate'
import type { Data, Repository } from './repository'

const player = (id: string): Player => ({ id, name: id, guest: false, createdAt: 0 })
const session = (id: string, endedAt?: number): Session => ({
  id,
  name: id,
  createdAt: 0,
  ...(endedAt ? { endedAt } : {}),
  shared: false,
  config: DEFAULT_CONFIG,
  players: [],
  seats: [],
  rounds: [],
})
const data = (players: Player[], sessions: Session[], currentSessionId?: string): Data => ({
  players,
  sessions,
  settings: { defaultConfig: DEFAULT_CONFIG, ...(currentSessionId ? { currentSessionId } : {}) },
})
const repo = () =>
  ({ savePlayer: vi.fn(), saveSession: vi.fn(), saveSettings: vi.fn(), deletePlayer: vi.fn(), deleteSession: vi.fn(), subscribe: vi.fn() }) satisfies Repository

describe('importLocal', () => {
  it('copies only records the account does not have', () => {
    const local = data([player('a'), player('b')], [session('s1', 5), session('s2', 5)])
    const account = data([player('a')], [session('s1', 5)])
    expect(pendingImport(local, account).players.map((p) => p.id)).toEqual(['b'])
    const r = repo()
    expect(importLocal(local, account, r)).toEqual({ players: 1, sessions: 1 })
    expect(r.savePlayer).toHaveBeenCalledTimes(1)
    expect(r.saveSession).toHaveBeenCalledWith(expect.objectContaining({ id: 's2' }))
    expect(r.saveSettings).not.toHaveBeenCalled()
  })

  it('carries over a running game when the account has none', () => {
    const r = repo()
    importLocal(data([], [session('live')], 'live'), data([], []), r)
    expect(r.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ currentSessionId: 'live' }))
  })

  it('does not replace a game already running in the account', () => {
    const r = repo()
    importLocal(data([], [session('live')], 'live'), data([], [session('other')], 'other'), r)
    expect(r.saveSettings).not.toHaveBeenCalled()
  })
})
