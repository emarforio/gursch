import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../domain/types'
import type { Round, Session } from '../domain/types'
import { backupFileName, exportBackup, parseBackup } from './backup'
import type { Data } from './repository'

const round: Round = {
  id: 'r1',
  at: 10,
  seats: ['a', 'b'],
  cardsDealt: 6,
  finish: 1,
  scores: { a: 3, b: 13 },
  winnerId: 'a',
  loserId: 'b',
  formula: DEFAULT_CONFIG.formula,
  amount: 20,
}

const session: Session = {
  id: 's1',
  ownerUid: 'uid-1',
  name: 'Friday',
  createdAt: 5,
  shared: true,
  config: DEFAULT_CONFIG,
  players: [
    { id: 'a', name: 'Anna', avatar: 'data:image/jpeg;base64,AAAA' },
    { id: 'b', name: 'Bo' },
  ],
  seats: ['a', 'b'],
  rounds: [round],
}

const data: Data = {
  players: [
    { id: 'a', name: 'Anna', avatar: 'data:image/jpeg;base64,AAAA', guest: false, createdAt: 1 },
    { id: 'b', name: 'Bo', guest: true, createdAt: 2 },
  ],
  sessions: [session],
  settings: { defaultConfig: DEFAULT_CONFIG, currentSessionId: 's1' },
}

/** The exported file as an object that a test can damage before parsing it again. */
const exported = () => JSON.parse(exportBackup(data)) as Record<string, any>
const parse = (file: unknown) => parseBackup(JSON.stringify(file))

describe('backup', () => {
  it('survives a round trip, without the owner and the sharing', () => {
    const { ownerUid: _owner, ...rest } = session
    expect(parseBackup(exportBackup(data))).toEqual({ ...data, sessions: [{ ...rest, shared: false }] })
  })

  it('names the file after the date', () => {
    expect(backupFileName(Date.UTC(2026, 10, 12, 9))).toBe('gursch-2026-11-12.json')
  })

  it('rejects files that are not a backup', () => {
    expect(parseBackup('hello')).toBe('notABackup')
    expect(parseBackup('[]')).toBe('notABackup')
    expect(parseBackup('{"players":[],"sessions":[]}')).toBe('notABackup')
  })

  it('rejects a backup from a newer version', () => {
    expect(parse({ ...exported(), version: 2 })).toBe('tooNew')
  })

  it('rejects the whole file when one record is damaged', () => {
    const noName = exported()
    delete noName.players[1].name
    expect(parse(noName)).toBe('damaged')

    const noScore = exported()
    delete noScore.sessions[0].rounds[0].scores.b
    expect(parse(noScore)).toBe('damaged')

    const strangerWon = exported()
    strangerWon.sessions[0].rounds[0].winnerId = 'x'
    expect(parse(strangerWon)).toBe('damaged')

    const badFinish = exported()
    badFinish.sessions[0].rounds[0].finish = 5
    expect(parse(badFinish)).toBe('damaged')

    const badAvatar = exported()
    badAvatar.players[0].avatar = 'https://example.com/a.png'
    expect(parse(badAvatar)).toBe('damaged')

    expect(parse({ ...exported(), sessions: 'none' })).toBe('damaged')
  })

  it('fills in what an older or hand-edited file may leave out', () => {
    const file = exported()
    delete file.settings
    delete file.players[0].guest
    const result = parse(file)
    expect(result).toMatchObject({ settings: { defaultConfig: DEFAULT_CONFIG } })
    expect((result as Data).players[0]!.guest).toBe(false)
    expect((result as Data).settings.currentSessionId).toBeUndefined()
  })
})
