import { useRef, useState } from 'react'
import { toAvatar } from '../../data/image'
import { newId, useStore } from '../../data/store'
import type { Player } from '../../domain/types'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { MAX_NAME } from '../components/SeatingEditor'


export function PlayersPage() {
  const players = useStore((s) => s.players)
  const sessions = useStore((s) => s.sessions)
  const repo = useStore((s) => s.repo)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const regulars = players.filter((p) => !p.guest)
  const guests = players.filter((p) => p.guest)
  const used = new Set(sessions.flatMap((s) => s.players.map((p) => p.id)))
  const trimmed = name.trim()

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmed) return
    repo.savePlayer({ id: newId(), name: trimmed, guest: false, createdAt: Date.now() })
    setName('')
  }

  const row = (p: Player) => (
    <PlayerRow
      key={p.id}
      player={p}
      editing={editingId === p.id}
      onToggle={() => setEditingId(editingId === p.id ? null : p.id)}
      hasPlayed={used.has(p.id)}
    />
  )

  return (
    <section>
      <h1 className="text-2xl font-bold">Players</h1>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME}
          placeholder="Short name"
          aria-label="New player name"
          className="h-11 min-w-0 flex-1 rounded-lg bg-surface px-3 outline-none ring-1 ring-line focus:ring-2 focus:ring-accent"
        />
        <Button type="submit" variant="primary" disabled={!trimmed}>
          Add
        </Button>
      </form>

      {regulars.length === 0 && <p className="mt-6 text-muted">No players yet. Add the people you usually play with.</p>}
      {regulars.length > 0 && <ul className="mt-4 divide-y divide-line rounded-xl bg-surface">{regulars.map(row)}</ul>}

      {guests.length > 0 && (
        <>
          <h2 className="mt-8 font-semibold">Guests</h2>
          <p className="mt-1 text-sm text-muted">
            Temporary players. They are kept for history and stats but are not suggested for new sessions.
          </p>
          <ul className="mt-3 divide-y divide-line rounded-xl bg-surface">{guests.map(row)}</ul>
        </>
      )}
    </section>
  )
}

function PlayerRow(props: { player: Player; editing: boolean; onToggle: () => void; hasPlayed: boolean }) {
  const { player, editing, onToggle, hasPlayed } = props
  const repo = useStore((s) => s.repo)
  const [draft, setDraft] = useState(player.name)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const clean = draft.trim()

  async function pickPicture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      repo.savePlayer({ ...player, avatar: await toAvatar(file) })
      setError(null)
    } catch {
      setError('That picture could not be read.')
    }
  }

  function removePicture() {
    const { avatar: _removed, ...rest } = player
    repo.savePlayer(rest)
  }

  return (
    <li className="px-3 py-2">
      <button onClick={onToggle} className="flex w-full items-center gap-3 text-left" aria-expanded={editing}>
        <Avatar name={player.name} avatar={player.avatar} />
        <span className="flex-1 font-medium">{player.name}</span>
        <span className="text-sm text-muted">{editing ? 'Done' : 'Edit'}</span>
      </button>

      {editing && (
        <div className="mt-3 space-y-3 pb-2">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_NAME}
              aria-label="Name"
              className="h-11 min-w-0 flex-1 rounded-lg bg-bg px-3 outline-none ring-1 ring-line focus:ring-2 focus:ring-accent"
            />
            <Button onClick={() => repo.savePlayer({ ...player, name: clean })} disabled={!clean || clean === player.name}>
              Rename
            </Button>
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPicture} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              {player.avatar ? 'Change picture' : 'Add picture'}
            </Button>
            {player.avatar && (
              <Button size="sm" onClick={removePicture}>
                Remove picture
              </Button>
            )}
            {player.guest ? (
              <Button size="sm" onClick={() => repo.savePlayer({ ...player, guest: false })}>
                Make regular player
              </Button>
            ) : (
              hasPlayed && (
                <Button size="sm" onClick={() => repo.savePlayer({ ...player, guest: true })}>
                  Make guest
                </Button>
              )
            )}
            {!hasPlayed && (
              <Button size="sm" variant="danger" onClick={() => repo.deletePlayer(player.id)}>
                Delete
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-bad">{error}</p>}
        </div>
      )}
    </li>
  )
}
