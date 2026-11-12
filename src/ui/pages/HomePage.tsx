import { Link } from 'react-router-dom'
import { useStore } from '../../data/store'
import { useT } from '../../i18n'
import { GamePage } from './GamePage'
import { SessionList } from './HistoryPage'

export function HomePage() {
  const sessions = useStore((s) => s.sessions)
  const players = useStore((s) => s.players)
  const currentId = useStore((s) => s.settings.currentSessionId)
  const t = useT()
  const current = sessions.find((s) => s.id === currentId && !s.endedAt)

  if (current) return <GamePage key={current.id} session={current} />

  const recent = [...sessions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)
  return (
    <section>
      <h1 className="text-2xl font-bold">Gursch</h1>
      <p className="mt-2 text-muted">{t.home.tagline}</p>
      <Link
        to="/new"
        className="mt-5 flex h-12 items-center justify-center rounded-lg bg-accent text-lg font-medium text-accent-text"
      >
        {t.home.newSession}
      </Link>
      {recent.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 font-semibold">{t.home.recent}</h2>
          <SessionList sessions={recent} players={players} />
        </>
      )}
    </section>
  )
}
