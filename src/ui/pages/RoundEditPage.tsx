import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../data/store'
import type { Round } from '../../domain/types'
import { useT } from '../../i18n'
import { Button } from '../components/Button'
import { ConfirmButton } from '../components/Controls'
import { RoundEntry } from '../components/RoundEntry'
import type { RoundResult } from '../components/RoundEntry'
import { peopleOf } from '../format'

/** Correct or delete a round that has already been saved. */
export function RoundEditPage() {
  const { id, roundId } = useParams()
  const navigate = useNavigate()
  const players = useStore((s) => s.players)
  const repo = useStore((s) => s.repo)
  const t = useT()
  const session = useStore((s) => s.sessions.find((x) => x.id === id))
  const index = session?.rounds.findIndex((r) => r.id === roundId) ?? -1
  const round = session?.rounds[index]

  if (!session || !round) {
    return (
      <section>
        <h1 className="text-2xl font-bold">{t.roundEdit.notFound}</h1>
        <Link to="/" className="mt-3 inline-block text-accent underline">
          {t.common.back}
        </Link>
      </section>
    )
  }

  function save(result: RoundResult) {
    const { lastTrickLeaderId: _old, ...kept } = round!
    const updated: Round = { ...kept, ...result }
    repo.saveSession({ ...session!, rounds: session!.rounds.map((r) => (r.id === updated.id ? updated : r)) })
    navigate(-1)
  }

  function remove() {
    repo.saveSession({ ...session!, rounds: session!.rounds.filter((r) => r.id !== round!.id) })
    navigate(-1)
  }

  return (
    <section>
      <h1 className="text-xl font-bold">{t.roundEdit.title(index + 1)}</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
        {t.roundEdit.note(session.name, round.cardsDealt)}
      </p>
      <RoundEntry
        seats={round.seats}
        person={peopleOf(session, players)}
        formula={round.formula}
        cards={round.cardsDealt}
        initial={round}
        saveLabel={t.roundEdit.save}
        onSave={save}
      />
      <div className="mt-6 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate(-1)}>
          {t.common.cancel}
        </Button>
        <ConfirmButton label={t.roundEdit.delete} onConfirm={remove} danger />
      </div>
    </section>
  )
}
