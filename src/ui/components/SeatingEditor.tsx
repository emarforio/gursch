import { useState } from 'react'
import { newId, useStore } from '../../data/store'
import type { SessionPlayer } from '../../domain/types'
import { useT } from '../../i18n'
import { Avatar } from './Avatar'
import { Button } from './Button'

export const MAX_NAME = 12
const MAX_PLAYERS = 10

type Props = {
  seats: string[]
  onChange: (seats: string[]) => void
  /** People who can be seated but are not in the saved player list, such as earlier guests of this session. */
  extra?: SessionPlayer[]
}

/** Pick players and put them in clockwise order. New names can be added as guests or saved players. */
export function SeatingEditor({ seats, onChange, extra = [] }: Props) {
  const players = useStore((s) => s.players)
  const repo = useStore((s) => s.repo)
  const [name, setName] = useState('')
  const t = useT()

  const known = new Map<string, SessionPlayer & { guest?: boolean }>()
  for (const p of extra) known.set(p.id, p)
  for (const p of players) known.set(p.id, p)
  const extraIds = new Set(extra.map((p) => p.id))
  const available = [...known.values()].filter((p) => !seats.includes(p.id) && (!p.guest || extraIds.has(p.id)))
  const full = seats.length >= MAX_PLAYERS
  const trimmed = name.trim()

  function addNew(guest: boolean) {
    if (!trimmed || full) return
    const id = newId()
    repo.savePlayer({ id, name: trimmed, guest, createdAt: Date.now() })
    onChange([...seats, id])
    setName('')
  }

  function move(i: number, by: number) {
    const j = i + by
    if (j < 0 || j >= seats.length) return
    const next = [...seats]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    onChange(next)
  }

  const small = 'h-9 w-9 rounded-lg bg-sunken text-lg disabled:opacity-40'

  return (
    <div>
      {seats.length > 0 && (
        <ol className="divide-y divide-line rounded-xl bg-surface">
          {seats.map((id, i) => {
            const p = known.get(id) ?? { id, name: '?' }
            return (
              <li key={id} className="flex items-center gap-3 px-3 py-2">
                <span className="tabular w-4 text-sm text-muted">{i + 1}</span>
                <Avatar name={p.name} avatar={p.avatar} size={32} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.name}
                  {p.guest && <span className="ml-2 text-sm font-normal text-muted">{t.seating.guestTag}</span>}
                </span>
                <button className={small} disabled={i === 0} onClick={() => move(i, -1)} aria-label={t.seating.moveUp(p.name)}>
                  ↑
                </button>
                <button
                  className={small}
                  disabled={i === seats.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={t.seating.moveDown(p.name)}
                >
                  ↓
                </button>
                <button className={small} onClick={() => onChange(seats.filter((s) => s !== id))} aria-label={t.seating.remove(p.name)}>
                  ×
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {available.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {available.map((p) => (
            <button
              key={p.id}
              disabled={full}
              onClick={() => onChange([...seats, p.id])}
              className="flex h-11 items-center gap-2 rounded-full bg-surface pl-1.5 pr-4 font-medium disabled:opacity-40"
            >
              <Avatar name={p.name} avatar={p.avatar} size={32} />
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME}
          placeholder={t.seating.someoneNew}
          aria-label={t.seating.newPlayerName}
          className="h-11 min-w-0 flex-1 rounded-lg bg-surface px-3 outline-none ring-1 ring-line focus:ring-2 focus:ring-accent"
        />
        <Button disabled={!trimmed || full} onClick={() => addNew(true)}>
          {t.seating.guest}
        </Button>
        <Button disabled={!trimmed || full} onClick={() => addNew(false)}>
          {t.seating.save}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">{t.seating.help}</p>
    </div>
  )
}
