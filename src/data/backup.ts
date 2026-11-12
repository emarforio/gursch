import { DEFAULT_CONFIG } from '../domain/types'
import type { DealRule, Player, Round, Session, SessionConfig, SessionPlayer } from '../domain/types'
import type { Data } from './repository'

const APP = 'gursch'
const VERSION = 1

export type BackupError = 'notABackup' | 'damaged' | 'tooNew'

/**
 * The data as the text of a backup file. Sharing is tied to an account, so
 * sessions are written without their owner and as not shared.
 */
export function exportBackup(data: Data, now = Date.now()): string {
  const sessions = data.sessions.map(({ ownerUid: _owner, ...s }) => ({ ...s, shared: false }))
  return JSON.stringify({ app: APP, version: VERSION, exportedAt: now, players: data.players, sessions, settings: data.settings }, null, 2)
}

export function backupFileName(now = Date.now()): string {
  return `gursch-${new Date(now).toISOString().slice(0, 10)}.json`
}

class Invalid extends Error {}

function check(ok: boolean): asserts ok {
  if (!ok) throw new Invalid()
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => isText(x) && x !== '')

function list(v: unknown): unknown[] {
  check(Array.isArray(v))
  return v
}

function avatarOf(v: unknown): { avatar?: string } {
  if (v === undefined) return {}
  check(isText(v) && v.startsWith('data:image/'))
  return { avatar: v }
}

function playerOf(v: unknown): Player {
  check(isObject(v) && isText(v.id) && v.id !== '' && isText(v.name) && isNumber(v.createdAt))
  check(v.guest === undefined || typeof v.guest === 'boolean')
  return { id: v.id, name: v.name, guest: v.guest ?? false, createdAt: v.createdAt, ...avatarOf(v.avatar) }
}

function sessionPlayerOf(v: unknown): SessionPlayer {
  check(isObject(v) && isText(v.id) && v.id !== '' && isText(v.name))
  return { id: v.id, name: v.name, ...avatarOf(v.avatar) }
}

function configOf(v: unknown): SessionConfig {
  check(isObject(v) && isNumber(v.startCards) && isText(v.formula) && isObject(v.dealRule))
  const rule = v.dealRule
  check(rule.mode === 'fixed' || rule.mode === 'loserScore' || rule.mode === 'difference')
  check(isNumber(rule.capBelowMax) && (rule.fixed === undefined || isNumber(rule.fixed)))
  const dealRule: DealRule = { mode: rule.mode, capBelowMax: rule.capBelowMax, ...(rule.fixed === undefined ? {} : { fixed: rule.fixed }) }
  return { startCards: v.startCards, dealRule, formula: v.formula }
}

function roundOf(v: unknown): Round {
  check(isObject(v) && isText(v.id) && v.id !== '' && isNumber(v.at) && isNumber(v.cardsDealt) && isNumber(v.amount) && isText(v.formula))
  check(v.finish === 1 || v.finish === 2 || v.finish === 3 || v.finish === 4)
  check(isIds(v.seats) && v.seats.length >= 2 && isObject(v.scores))
  const scores: Record<string, number> = {}
  for (const id of v.seats) {
    const score = v.scores[id]
    check(isNumber(score))
    scores[id] = score
  }
  check(isText(v.winnerId) && isText(v.loserId) && v.seats.includes(v.winnerId) && v.seats.includes(v.loserId))
  check(v.lastTrickLeaderId === undefined || (isText(v.lastTrickLeaderId) && v.seats.includes(v.lastTrickLeaderId)))
  return {
    id: v.id,
    at: v.at,
    seats: v.seats,
    cardsDealt: v.cardsDealt,
    finish: v.finish,
    scores,
    ...(v.lastTrickLeaderId === undefined ? {} : { lastTrickLeaderId: v.lastTrickLeaderId }),
    winnerId: v.winnerId,
    loserId: v.loserId,
    formula: v.formula,
    amount: v.amount,
  }
}

function sessionOf(v: unknown): Session {
  check(isObject(v) && isText(v.id) && v.id !== '' && isText(v.name) && isNumber(v.createdAt) && isIds(v.seats))
  check(v.endedAt === undefined || isNumber(v.endedAt))
  check(v.dealOverride === undefined || isNumber(v.dealOverride))
  return {
    id: v.id,
    name: v.name,
    createdAt: v.createdAt,
    ...(v.endedAt === undefined ? {} : { endedAt: v.endedAt }),
    shared: false,
    config: configOf(v.config),
    players: list(v.players).map(sessionPlayerOf),
    seats: v.seats,
    ...(v.dealOverride === undefined ? {} : { dealOverride: v.dealOverride }),
    rounds: list(v.rounds).map(roundOf),
  }
}

/**
 * Reads the text of a backup file. Every record is checked, and one bad record
 * rejects the whole file, so a damaged backup is never half imported.
 */
export function parseBackup(text: string): Data | BackupError {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return 'notABackup'
  }
  if (!isObject(raw) || raw.app !== APP || !isNumber(raw.version)) return 'notABackup'
  if (raw.version > VERSION) return 'tooNew'
  try {
    const settings = isObject(raw.settings) ? raw.settings : {}
    return {
      players: list(raw.players).map(playerOf),
      sessions: list(raw.sessions).map(sessionOf),
      settings: {
        defaultConfig: settings.defaultConfig === undefined ? DEFAULT_CONFIG : configOf(settings.defaultConfig),
        ...(isText(settings.currentSessionId) ? { currentSessionId: settings.currentSessionId } : {}),
      },
    }
  } catch (e) {
    if (e instanceof Invalid) return 'damaged'
    throw e
  }
}
