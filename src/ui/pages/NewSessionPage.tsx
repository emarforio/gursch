import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { newId, useStore } from '../../data/store'
import { maxDeal } from '../../domain/deal'
import type { Player, Session, SessionPlayer } from '../../domain/types'
import { useT } from '../../i18n'
import { BottomBar } from '../components/BottomBar'
import { Button } from '../components/Button'
import { ConfigEditor, isConfigValid } from '../components/ConfigEditor'
import { SeatingEditor } from '../components/SeatingEditor'
import { fmtDate } from '../format'

export function snapshot(p: Player | SessionPlayer): SessionPlayer {
  return p.avatar ? { id: p.id, name: p.name, avatar: p.avatar } : { id: p.id, name: p.name }
}

export function NewSessionPage() {
  const players = useStore((s) => s.players)
  const settings = useStore((s) => s.settings)
  const repo = useStore((s) => s.repo)
  const navigate = useNavigate()
  const t = useT()
  const [seats, setSeats] = useState<string[]>([])
  const [config, setConfig] = useState(settings.defaultConfig)

  function start() {
    const now = Date.now()
    const byId = new Map(players.map((p) => [p.id, p]))
    const session: Session = {
      id: newId(),
      name: fmtDate(now),
      createdAt: now,
      shared: false,
      config: { ...config, startCards: Math.min(config.startCards, maxDeal(seats.length)) },
      players: seats.map((id) => snapshot(byId.get(id)!)),
      seats,
      rounds: [],
    }
    repo.saveSession(session)
    repo.saveSettings({ ...settings, defaultConfig: config, currentSessionId: session.id })
    navigate('/')
  }

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="text-2xl font-bold">{t.newSession.title}</h1>

      <h2 className="mt-5 font-semibold">{t.newSession.seating}</h2>
      <p className="mt-1 mb-3 text-sm text-muted">{t.newSession.seatingNote}</p>
      <SeatingEditor seats={seats} onChange={setSeats} />

      <details className="mt-6 rounded-xl bg-surface">
        <summary className="cursor-pointer px-3 py-3 font-semibold">{t.common.dealAndMoney}</summary>
        <div className="border-t border-line px-3 py-4">
          <ConfigEditor config={config} onChange={setConfig} playerCount={seats.length} showStartCards />
        </div>
      </details>

      <BottomBar>
        <Button variant="primary" className="h-13 w-full text-lg" disabled={seats.length < 2 || !isConfigValid(config)} onClick={start}>
          {seats.length < 2 ? t.newSession.needTwo : t.newSession.start(seats.length)}
        </Button>
      </BottomBar>
    </section>
  )
}
