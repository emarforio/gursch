import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../data/store'
import type { SessionConfig } from '../../domain/types'
import { Button } from '../components/Button'
import { ConfigEditor, isConfigValid } from '../components/ConfigEditor'
import { ConfirmButton } from '../components/Controls'
import { ScoreTable } from '../components/ScoreTable'
import { SettleUp } from '../components/SettleUp'
import { SharePanel } from '../components/SharePanel'
import { fmtDate, peopleOf } from '../format'

export function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const players = useStore((s) => s.players)
  const sessions = useStore((s) => s.sessions)
  const settings = useStore((s) => s.settings)
  const repo = useStore((s) => s.repo)
  const session = sessions.find((s) => s.id === id)

  if (!session) {
    return (
      <section>
        <h1 className="text-2xl font-bold">Session not found</h1>
        <Link to="/history" className="mt-3 inline-block text-accent underline">
          Back to history
        </Link>
      </section>
    )
  }

  const person = peopleOf(session, players)
  const ended = session.endedAt !== undefined
  const isCurrent = settings.currentSessionId === session.id && !ended
  const otherRunning = sessions.some((s) => s.id === settings.currentSessionId && s.id !== session.id && !s.endedAt)
  const rounds = session.rounds.length

  function setConfig(config: SessionConfig) {
    repo.saveSession({ ...session!, config })
  }

  function end() {
    const { currentSessionId: _done, ...rest } = settings
    repo.saveSession({ ...session!, endedAt: Date.now() })
    repo.saveSettings(rest)
  }

  function reopen() {
    const { endedAt: _reopened, ...rest } = session!
    repo.saveSession(rest)
    repo.saveSettings({ ...settings, currentSessionId: session!.id })
    navigate('/')
  }

  function remove() {
    if (settings.currentSessionId === session!.id) {
      const { currentSessionId: _gone, ...rest } = settings
      repo.saveSettings(rest)
    }
    repo.deleteSession(session!.id)
    navigate('/history')
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">{session.name}</h1>
      <p className="mt-1 text-muted">
        {fmtDate(session.createdAt)} · {rounds} {rounds === 1 ? 'round' : 'rounds'} · {ended ? 'Ended' : 'In progress'}
      </p>

      {isCurrent && (
        <Link to="/" className="mt-4 flex h-11 items-center justify-center rounded-lg bg-accent font-medium text-accent-text">
          Back to the game
        </Link>
      )}

      {rounds > 0 && (
        <Link
          to={`/stats?session=${session.id}`}
          className="mt-3 flex h-11 items-center justify-center rounded-lg bg-sunken font-medium"
        >
          Stats for this session
        </Link>
      )}

      <h2 className="mt-6 mb-2 font-semibold">Settle up</h2>
      <SettleUp session={session} person={person} />

      <h2 className="mt-6 mb-2 font-semibold">Scores</h2>
      <ScoreTable session={session} person={person} onPickRound={(rid) => navigate(`/session/${session.id}/round/${rid}`)} />

      <SharePanel session={session} />

      {!ended && (
        <details className="mt-6 rounded-xl bg-surface">
          <summary className="cursor-pointer px-3 py-3 font-semibold">Deal and money settings</summary>
          <div className="border-t border-line px-3 py-4">
            <p className="mb-4 text-sm text-muted">Changes apply to the coming rounds. Rounds already played keep their amounts.</p>
            <ConfigEditor config={session.config} onChange={setConfig} playerCount={session.seats.length} />
            {!isConfigValid(session.config) && (
              <p className="mt-3 text-sm text-bad">Fix the formula before saving the next round.</p>
            )}
          </div>
        </details>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {!ended && (
          <Link to={`/session/${session.id}/seating`} className="flex h-9 items-center rounded-lg bg-sunken px-3 text-sm font-medium">
            Change players
          </Link>
        )}
        {!ended && <ConfirmButton label="End session" onConfirm={end} />}
        {ended && !otherRunning && (
          <Button size="sm" onClick={reopen}>
            Reopen session
          </Button>
        )}
        <ConfirmButton label="Delete session" onConfirm={remove} danger />
      </div>
    </section>
  )
}
