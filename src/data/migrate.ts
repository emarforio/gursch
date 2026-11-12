import type { Data, Repository } from './repository'

const key = (uid: string) => `gursch.v1.import.${uid}`

/** Whether the user has already answered the "copy this device's data" question for this account. */
export function importAnswered(uid: string): boolean {
  try {
    return localStorage.getItem(key(uid)) !== null
  } catch {
    return true
  }
}

export function markImport(uid: string, answer: 'done' | 'skipped') {
  try {
    localStorage.setItem(key(uid), answer)
  } catch {
    // Not essential.
  }
}

export function forgetImport(uid: string) {
  try {
    localStorage.removeItem(key(uid))
  } catch {
    // Not essential.
  }
}

/** What copying would add: local records whose id is not in the account yet. */
export function pendingImport(local: Data, account: Data) {
  const playerIds = new Set(account.players.map((p) => p.id))
  const sessionIds = new Set(account.sessions.map((s) => s.id))
  return {
    players: local.players.filter((p) => !playerIds.has(p.id)),
    sessions: local.sessions.filter((s) => !sessionIds.has(s.id)),
  }
}

/**
 * Copies this device's players and sessions into the account. Records are
 * matched by id and never overwritten, so running it twice is harmless. The
 * local data is left in place.
 */
export function importLocal(local: Data, account: Data, repo: Repository): { players: number; sessions: number } {
  const { players, sessions } = pendingImport(local, account)
  players.forEach((p) => repo.savePlayer(p))
  sessions.forEach((s) => repo.saveSession(s))
  // Carry over a game in progress if the account has none.
  const running = local.settings.currentSessionId
  const accountRunning = account.sessions.some((s) => s.id === account.settings.currentSessionId && !s.endedAt)
  if (running && !accountRunning && sessions.some((s) => s.id === running && !s.endedAt)) {
    repo.saveSettings({ ...account.settings, currentSessionId: running })
  }
  return { players: players.length, sessions: sessions.length }
}
