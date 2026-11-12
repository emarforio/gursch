import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../../data/store'
import { computeStats } from '../../domain/stats'
import type { PlayerStats, RecordRound, Stats } from '../../domain/stats'
import type { Player, Session, SessionPlayer } from '../../domain/types'
import { useT } from '../../i18n'
import type { Dictionary } from '../../i18n'
import { Avatar } from '../components/Avatar'
import { CardBars, LineChart, seriesColor } from '../components/Charts'
import { fmtAverage, fmtMoney, fmtPercent, fmtSigned } from '../format'

type Person = (id: string) => SessionPlayer

function personLookup(players: Player[], sessions: Session[]): Person {
  const map = new Map<string, SessionPlayer>()
  for (const s of sessions) for (const p of s.players) map.set(p.id, p)
  for (const p of players) map.set(p.id, p)
  return (id) => map.get(id) ?? { id, name: '?' }
}

const pct = fmtPercent
const tone = (n: number) => (n > 0 ? 'text-good' : n < 0 ? 'text-bad' : '')

export function StatsPage() {
  const players = useStore((s) => s.players)
  const sessions = useStore((s) => s.sessions)
  const [params, setParams] = useSearchParams()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const t = useT()

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
      <h1 className="text-2xl font-bold">{t.stats.title}</h1>

      <select
        value={scoped?.id ?? ''}
        onChange={(e) => setParams(e.target.value ? { session: e.target.value } : {})}
        aria-label={t.stats.scope}
        className="mt-4 h-11 w-full rounded-lg bg-surface px-3 ring-1 ring-line"
      >
        <option value="">{t.stats.allSessions}</option>
        {sorted.map((s) => (
          <option key={s.id} value={s.id}>
            {t.stats.sessionOption(s.name, s.rounds.length)}
          </option>
        ))}
      </select>

      {stats.rounds === 0 || !selected ? (
        <p className="mt-6 text-muted">{t.stats.none}</p>
      ) : (
        <>
          <Overview stats={stats} person={person} allSessions={!scoped} />

          <h2 className="mt-8 mb-2 font-semibold">{t.common.moneyOverTime}</h2>
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

          <h2 className="mt-8 mb-2 font-semibold">{t.stats.players}</h2>
          <div className="overflow-x-auto rounded-xl bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-3 py-2 text-left font-medium">{t.stats.player}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.stats.rounds}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.stats.won}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.stats.lost}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.stats.avg}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.stats.net}</th>
                </tr>
              </thead>
              <tbody>
                {stats.players.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setPickedId(p.id)}
                    className={`cursor-pointer border-t border-line ${p.id === selected.id ? 'bg-sunken' : ''}`}
                  >
                    <td className="w-full max-w-0 px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(p.id) }} />
                        <span className="truncate font-medium">{person(p.id).name}</span>
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
          <p className="mt-1 text-sm text-muted">{t.stats.tapPlayer}</p>

          <PlayerDetail p={selected} stats={stats} person={person} color={colorOf(selected.id)} allSessions={!scoped} />

          <h2 className="mt-8 mb-2 font-semibold">{t.stats.whoPays}</h2>
          <ul className="divide-y divide-line rounded-xl bg-surface">
            {stats.pairings.slice(0, 6).map((pair) => (
              <li key={pair.winnerId + pair.loserId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span>
                  <span className="font-medium">{person(pair.loserId).name}</span>
                  <span className="text-muted"> {t.stats.lostTo} </span>
                  <span className="font-medium">{person(pair.winnerId).name}</span>
                  <span className="text-muted"> {t.stats.times(pair.count)}</span>
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

function matchup(t: Dictionary, r: RecordRound, person: Person) {
  return t.stats.matchup(person(r.round.loserId).name, person(r.round.winnerId).name)
}

function Overview({ stats, person, allSessions }: { stats: Stats; person: Person; allSessions: boolean }) {
  const t = useT()
  const big = stats.biggestAmount
  const diff = stats.largestDiff
  const sets = stats.finishes[2] + stats.finishes[3] + stats.finishes[4]
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Tile label={t.stats.rounds} value={stats.rounds} note={allSessions ? t.stats.inSessions(stats.sessions) : undefined} />
      <Tile label={t.stats.averageOwed} value={stats.averageAmount === null ? '–' : fmtMoney(stats.averageAmount)} note={t.stats.perRound} />
      {big && <Tile label={t.stats.biggestRound} value={fmtMoney(big.round.amount)} note={matchup(t, big, person)} />}
      {diff && (
        <Tile
          label={t.stats.largestDiff}
          value={t.stats.against(t.common.card(diff.round.scores[diff.round.loserId]!), t.common.card(diff.round.scores[diff.round.winnerId]!))}
          note={matchup(t, diff, person)}
        />
      )}
      <Tile label={t.stats.averageDiff} value={fmtAverage(stats.averageDiff)} note={t.stats.loserMinusWinner} />
      <Tile
        label={t.stats.averageDeal}
        value={fmtAverage(stats.averageCards)}
        note={stats.commonDeal === null ? undefined : t.stats.mostOften(stats.commonDeal)}
      />
      <Tile label={t.stats.tieBreaks} value={stats.tieBreaks} note={t.stats.ofRounds(pct(stats.tieBreaks, stats.rounds))} />
      <Tile
        label={t.stats.multiCard}
        value={sets}
        note={t.stats.finishCounts(stats.finishes[2], stats.finishes[3], stats.finishes[4])}
      />
    </div>
  )
}

function PlayerDetail(props: { p: PlayerStats; stats: Stats; person: Person; color: string; allSessions: boolean }) {
  const { p, stats, person, color, allSessions } = props
  const t = useT()
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
        <Tile label={t.stats.wins} value={p.wins} note={t.stats.shareOfRounds(pct(p.wins, p.rounds), p.rounds)} />
        <Tile label={t.stats.losses} value={p.losses} note={t.stats.shareOfRounds(pct(p.losses, p.rounds), p.rounds)} />
        <Tile
          label={t.stats.net}
          value={<span className={tone(p.net)}>{fmtSigned(p.net)}</span>}
          note={t.stats.wonLost(fmtMoney(p.moneyWon), fmtMoney(p.moneyLost))}
        />
        {allSessions && <Tile label={t.stats.sessionsWon} value={p.sessionsWon} note={t.stats.of(p.sessions)} />}
        <Tile label={t.stats.biggestWin} value={fmtMoney(p.biggestWin)} />
        <Tile label={t.stats.biggestLoss} value={fmtMoney(p.biggestLoss)} />
        <Tile label={t.stats.winStreak} value={p.longestWinStreak} note={t.stats.inARow} />
        <Tile label={t.stats.lossStreak} value={p.longestLossStreak} note={t.stats.inARow} />
        <Tile label={t.stats.onAce} value={p.aces} note={pct(p.aces, singles)} />
        <Tile label={t.stats.onTwo} value={p.twos} note={pct(p.twos, singles)} />
        <Tile label={t.stats.ties} value={`${p.tiesWon} – ${p.tiesLost}`} note={t.stats.tiesNote} />
        <Tile label={t.stats.averageCard} value={fmtAverage(p.average)} />
      </div>

      {singles > 0 && (
        <>
          <h3 className="mt-5 mb-2 font-semibold">{t.stats.finalCards}</h3>
          <div className="rounded-xl bg-surface p-3">
            <CardBars key={p.id} counts={p.cards} color={color} />
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 font-semibold">{t.stats.headToHead}</h3>
          <div className="overflow-x-auto rounded-xl bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-3 py-2 text-left font-medium">{t.stats.opponent}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.stats.took}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.stats.paid}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.stats.net}</th>
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
          <p className="mt-1 text-sm text-muted">{t.stats.headToHeadNote}</p>
        </>
      )}
    </div>
  )
}
