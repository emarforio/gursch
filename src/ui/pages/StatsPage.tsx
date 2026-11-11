import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../../data/store'
import { cardLabel } from '../../domain/scoring'
import { computeStats } from '../../domain/stats'
import type { PlayerStats, RecordRound, Stats } from '../../domain/stats'
import type { Player, Session, SessionPlayer } from '../../domain/types'
import { Avatar } from '../components/Avatar'
import { CardBars, LineChart, seriesColor } from '../components/Charts'
import { fmtAverage, fmtMoney, fmtSigned } from '../format'

type Person = (id: string) => SessionPlayer

function personLookup(players: Player[], sessions: Session[]): Person {
  const map = new Map<string, SessionPlayer>()
  for (const s of sessions) for (const p of s.players) map.set(p.id, p)
  for (const p of players) map.set(p.id, p)
  return (id) => map.get(id) ?? { id, name: '?' }
}

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '–')
const tone = (n: number) => (n > 0 ? 'text-good' : n < 0 ? 'text-bad' : '')

export function StatsPage() {
  const players = useStore((s) => s.players)
  const sessions = useStore((s) => s.sessions)
  const [params, setParams] = useSearchParams()
  const [pickedId, setPickedId] = useState<string | null>(null)

  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt)
  const scopeId = params.get('session')
  const scoped = sorted.find((s) => s.id === scopeId)
  const stats = computeStats(scoped ? [scoped] : sessions)
  const person = personLookup(players, sessions)

  // Colour follows the player, not their rank in the current view.
  const order = [...players].sort((a, b) => a.createdAt - b.createdAt).map((p) => p.id)
  const colorOf = (id: string) => seriesColor(order.indexOf(id))
  const selected = stats.players.find((p) => p.id === pickedId) ?? stats.players[0]

  return (
    <section>
      <h1 className="text-2xl font-bold">Stats</h1>

      <select
        value={scoped?.id ?? ''}
        onChange={(e) => setParams(e.target.value ? { session: e.target.value } : {})}
        aria-label="Which sessions to include"
        className="mt-4 h-11 w-full rounded-lg bg-surface px-3 ring-1 ring-line"
      >
        <option value="">All sessions</option>
        {sorted.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.rounds.length} rounds)
          </option>
        ))}
      </select>

      {stats.rounds === 0 || !selected ? (
        <p className="mt-6 text-muted">No rounds to show yet. Stats appear once a round has been saved.</p>
      ) : (
        <>
          <Overview stats={stats} person={person} allSessions={!scoped} />

          <h2 className="mt-8 mb-2 font-semibold">Money over time</h2>
          <div className="rounded-xl bg-surface p-3">
            <LineChart
              series={stats.timeline.ids.map((id) => ({
                id,
                name: person(id).name,
                color: colorOf(id),
                values: [0, ...carry(stats.timeline.points, id)],
              }))}
            />
          </div>

          <h2 className="mt-8 mb-2 font-semibold">Players</h2>
          <div className="overflow-x-auto rounded-xl bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-3 py-2 text-left font-medium">Player</th>
                  <th className="px-2 py-2 text-right font-medium">Rounds</th>
                  <th className="px-2 py-2 text-right font-medium">Won</th>
                  <th className="px-2 py-2 text-right font-medium">Lost</th>
                  <th className="px-2 py-2 text-right font-medium">Avg</th>
                  <th className="px-3 py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {stats.players.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setPickedId(p.id)}
                    className={`cursor-pointer border-t border-line ${p.id === selected.id ? 'bg-sunken' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(p.id) }} />
                        <span className="font-medium">{person(p.id).name}</span>
                      </span>
                    </td>
                    <td className="tabular px-2 py-2 text-right">{p.rounds}</td>
                    <td className="tabular px-2 py-2 text-right">{pct(p.wins, p.rounds)}</td>
                    <td className="tabular px-2 py-2 text-right">{pct(p.losses, p.rounds)}</td>
                    <td className="tabular px-2 py-2 text-right">{fmtAverage(p.average)}</td>
                    <td className={`tabular px-3 py-2 text-right font-semibold ${tone(p.net)}`}>{fmtSigned(p.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-sm text-muted">Tap a player for their details.</p>

          <PlayerDetail p={selected} stats={stats} person={person} color={colorOf(selected.id)} allSessions={!scoped} />

          <h2 className="mt-8 mb-2 font-semibold">Who pays whom</h2>
          <ul className="divide-y divide-line rounded-xl bg-surface">
            {stats.pairings.slice(0, 6).map((pair) => (
              <li key={pair.winnerId + pair.loserId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span>
                  <span className="font-medium">{person(pair.loserId).name}</span>
                  <span className="text-muted"> lost to </span>
                  <span className="font-medium">{person(pair.winnerId).name}</span>
                  <span className="text-muted"> {pair.count === 1 ? 'once' : `${pair.count} times`}</span>
                </span>
                <span className="tabular font-semibold">{fmtMoney(pair.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** A player's balance after every round, holding the last value while they sit out. */
function carry(points: Record<string, number>[], id: string): number[] {
  let lastValue = 0
  return points.map((p) => (lastValue = p[id] ?? lastValue))
}

function Tile({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5">
      <div className="text-sm text-muted">{label}</div>
      <div className="tabular text-xl font-bold">{value}</div>
      {note && <div className="text-sm text-muted">{note}</div>}
    </div>
  )
}

function matchup(r: RecordRound, person: Person) {
  return `${person(r.round.loserId).name} to ${person(r.round.winnerId).name}`
}

function Overview({ stats, person, allSessions }: { stats: Stats; person: Person; allSessions: boolean }) {
  const big = stats.biggestAmount
  const diff = stats.largestDiff
  const sets = stats.finishes[2] + stats.finishes[3] + stats.finishes[4]
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Tile label="Rounds" value={stats.rounds} note={allSessions ? `in ${stats.sessions} ${stats.sessions === 1 ? 'session' : 'sessions'}` : undefined} />
      <Tile label="Average owed" value={stats.averageAmount === null ? '–' : fmtMoney(stats.averageAmount)} note="per round" />
      {big && <Tile label="Biggest round" value={fmtMoney(big.round.amount)} note={matchup(big, person)} />}
      {diff && (
        <Tile
          label="Largest difference"
          value={`${cardLabel(diff.round.scores[diff.round.loserId]!)} against ${cardLabel(diff.round.scores[diff.round.winnerId]!)}`}
          note={matchup(diff, person)}
        />
      )}
      <Tile label="Average difference" value={stats.averageDiff === null ? '–' : stats.averageDiff.toFixed(1)} note="loser minus winner" />
      <Tile
        label="Average deal"
        value={stats.averageCards === null ? '–' : stats.averageCards.toFixed(1)}
        note={stats.commonDeal === null ? undefined : `most often ${stats.commonDeal} cards`}
      />
      <Tile label="Tie-breaks" value={stats.tieBreaks} note={pct(stats.tieBreaks, stats.rounds) + ' of rounds'} />
      <Tile
        label="Multi-card finishes"
        value={sets}
        note={`${stats.finishes[2]} dofflar, ${stats.finishes[3]} trofflar, ${stats.finishes[4]} fofflar`}
      />
    </div>
  )
}

function PlayerDetail(props: { p: PlayerStats; stats: Stats; person: Person; color: string; allSessions: boolean }) {
  const { p, stats, person, color, allSessions } = props
  const me = person(p.id)
  const others = stats.players
    .filter((o) => o.id !== p.id)
    .map((o) => {
      const took = stats.pairings.find((x) => x.winnerId === p.id && x.loserId === o.id)
      const paid = stats.pairings.find((x) => x.winnerId === o.id && x.loserId === p.id)
      return { id: o.id, took, paid, net: (took?.amount ?? 0) - (paid?.amount ?? 0) }
    })
    .filter((o) => o.took || o.paid)
    .sort((a, b) => b.net - a.net)
  const singles = Object.values(p.cards).reduce((s, n) => s + n, 0)

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center gap-3">
        <Avatar name={me.name} avatar={me.avatar} />
        <h2 className="text-lg font-bold">{me.name}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Wins" value={p.wins} note={`${pct(p.wins, p.rounds)} of ${p.rounds} rounds`} />
        <Tile label="Losses" value={p.losses} note={`${pct(p.losses, p.rounds)} of ${p.rounds} rounds`} />
        <Tile label="Net" value={<span className={tone(p.net)}>{fmtSigned(p.net)}</span>} note={`won ${fmtMoney(p.moneyWon)}, lost ${fmtMoney(p.moneyLost)}`} />
        {allSessions && <Tile label="Sessions won" value={p.sessionsWon} note={`of ${p.sessions}`} />}
        <Tile label="Biggest win" value={fmtMoney(p.biggestWin)} />
        <Tile label="Biggest loss" value={fmtMoney(p.biggestLoss)} />
        <Tile label="Best win streak" value={p.longestWinStreak} note="rounds in a row" />
        <Tile label="Worst losing streak" value={p.longestLossStreak} note="rounds in a row" />
        <Tile label="Finished on an ace" value={p.aces} note={pct(p.aces, singles)} />
        <Tile label="Finished on a 2" value={p.twos} note={pct(p.twos, singles)} />
        <Tile label="Ties" value={`${p.tiesWon} – ${p.tiesLost}`} note="went their way – against" />
        <Tile label="Average card" value={fmtAverage(p.average)} />
      </div>

      {singles > 0 && (
        <>
          <h3 className="mt-5 mb-2 font-semibold">Final cards</h3>
          <div className="rounded-xl bg-surface p-3">
            <CardBars key={p.id} counts={p.cards} color={color} />
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 font-semibold">Head to head</h3>
          <div className="overflow-x-auto rounded-xl bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-3 py-2 text-left font-medium">Against</th>
                  <th className="px-2 py-2 text-right font-medium">Took</th>
                  <th className="px-2 py-2 text-right font-medium">Paid</th>
                  <th className="px-3 py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {others.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium">{person(o.id).name}</td>
                    <td className="tabular px-2 py-2 text-right">
                      {fmtMoney(o.took?.amount ?? 0)} <span className="text-muted">({o.took?.count ?? 0})</span>
                    </td>
                    <td className="tabular px-2 py-2 text-right">
                      {fmtMoney(o.paid?.amount ?? 0)} <span className="text-muted">({o.paid?.count ?? 0})</span>
                    </td>
                    <td className={`tabular px-3 py-2 text-right font-semibold ${tone(o.net)}`}>{fmtSigned(o.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-sm text-muted">Amounts, with the number of rounds in brackets.</p>
        </>
      )}
    </div>
  )
}
