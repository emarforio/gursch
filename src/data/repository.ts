import type { Player, Session, SessionConfig } from '../domain/types'

export type Settings = {
  defaultConfig: SessionConfig
  currentSessionId?: string
}

export type Data = {
  players: Player[]
  sessions: Session[]
  settings: Settings
}

/** Storage backend. One is active at a time: localStorage, or Firestore when signed in. */
export interface Repository {
  /** Calls back with the current data immediately and again on every change. */
  subscribe(cb: (data: Data) => void): () => void
  savePlayer(player: Player): void
  deletePlayer(id: string): void
  saveSession(session: Session): void
  deleteSession(id: string): void
  saveSettings(settings: Settings): void
}
