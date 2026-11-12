import { DEFAULT_CONFIG } from '../domain/types'
import type { Player, Session } from '../domain/types'
import type { Data, Repository, Settings } from './repository'

const KEYS = {
  players: 'gursch.v1.players',
  sessions: 'gursch.v1.sessions',
  settings: 'gursch.v1.settings',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage is full or blocked. The app keeps working from memory.
  }
}

function load(): Data {
  return {
    players: read<Player[]>(KEYS.players, []),
    sessions: read<Session[]>(KEYS.sessions, []),
    settings: { defaultConfig: DEFAULT_CONFIG, ...read<Partial<Settings>>(KEYS.settings, {}) },
  }
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
}

export type LocalRepository = Repository & {
  /** Deletes every player, session and setting saved on this device. */
  clear(): void
}

export function createLocalRepo(): LocalRepository {
  let data = load()
  const listeners = new Set<(d: Data) => void>()
  const emit = () => listeners.forEach((cb) => cb(data))

  // Pick up changes made in another tab.
  window.addEventListener('storage', (e) => {
    if (e.key === null || Object.values(KEYS).includes(e.key as (typeof KEYS)[keyof typeof KEYS])) {
      data = load()
      emit()
    }
  })

  const set = <K extends keyof Data>(key: K, value: Data[K]) => {
    data = { ...data, [key]: value }
    write(KEYS[key], value)
    emit()
  }

  return {
    subscribe(cb) {
      listeners.add(cb)
      cb(data)
      return () => listeners.delete(cb)
    },
    savePlayer: (p) => set('players', upsert(data.players, p)),
    deletePlayer: (id) => set('players', data.players.filter((p) => p.id !== id)),
    saveSession: (s) => set('sessions', upsert(data.sessions, s)),
    deleteSession: (id) => set('sessions', data.sessions.filter((s) => s.id !== id)),
    saveSettings: (s) => set('settings', s),
    clear() {
      try {
        for (const key of Object.values(KEYS)) localStorage.removeItem(key)
      } catch {
        // Storage is blocked, so nothing was saved in the first place.
      }
      data = load()
      emit()
    },
  }
}
