import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../data/store'
import { useT } from '../../i18n'
import { Button } from '../components/Button'
import { SeatingEditor } from '../components/SeatingEditor'
import { snapshot } from './NewSessionPage'

/** Change who is playing and where they sit, between rounds. */
export function SeatingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const players = useStore((s) => s.players)
  const repo = useStore((s) => s.repo)
  const session = useStore((s) => s.sessions.find((x) => x.id === id))
  const [seats, setSeats] = useState<string[] | null>(null)
  const t = useT()

  if (!session || session.endedAt) {
    return (
      <section>
        <h1 className="text-2xl font-bold">{t.seatingPage.notInProgress}</h1>
        <Link to="/" className="mt-3 inline-block text-accent underline">
          {t.common.back}
        </Link>
      </section>
    )
  }

  const current = seats ?? session.seats

  function save() {
    const known = new Map(session!.players.map((p) => [p.id, p]))
    for (const p of players) if (current.includes(p.id) || known.has(p.id)) known.set(p.id, snapshot(p))
    const { dealOverride: _reset, ...rest } = session!
    repo.saveSession({ ...rest, seats: current, players: [...known.values()] })
    navigate('/')
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">{t.seatingPage.title}</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
        {t.seatingPage.note}
      </p>
      <SeatingEditor seats={current} onChange={setSeats} extra={session.players} />
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button onClick={() => navigate(-1)}>{t.common.cancel}</Button>
        <Button variant="primary" disabled={current.length < 2} onClick={save}>
          {current.length < 2 ? t.seatingPage.needTwo : t.common.done}
        </Button>
      </div>
    </section>
  )
}
