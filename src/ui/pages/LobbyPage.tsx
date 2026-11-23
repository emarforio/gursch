import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { firebaseConfigured } from '../../data/config'
import type { Lobby, Member } from '../../data/online'
import { useStore } from '../../data/store'
import { useT } from '../../i18n'
import { BottomBar } from '../components/BottomBar'
import { Button } from '../components/Button'
import { ConfigEditor, isConfigValid } from '../components/ConfigEditor'
import { ScoreTable } from '../components/ScoreTable'
import { MAX_NAME } from '../components/SeatingEditor'
import { SettleUp } from '../components/SettleUp'
import { fmtDate } from '../format'
import { Table } from '../online/Table'
import { MAX_ONLINE, saveName, savedName, useLobby } from '../online/useLobby'

export function LobbyPage() {
  const { id = '' } = useParams()
  const t = useT()
  if (!firebaseConfigured) {
    return (
      <section>
        <h1 className="text-2xl font-bold">{t.online.title}</h1>
        <p className="mt-2 text-muted">{t.online.notConfigured}</p>
      </section>
    )
  }
  return <LobbyView key={id} code={id.toLowerCase()} />
}

function LobbyView({ code }: { code: string }) {
  const t = useT()
  const L = useLobby(code)
  const { lobby, members, uid, host } = L

  // The host keeps the seating in step with who has joined: newcomers sit last, leavers are dropped.
  useEffect(() => {
    if (!host || !lobby || lobby.status !== 'open') return
    const ids = members.map((m) => m.uid)
    const kept = lobby.seats.filter((id) => ids.includes(id) || id === lobby.hostUid)
    const seats = [...kept, ...ids.filter((id) => !kept.includes(id))].slice(0, MAX_ONLINE)
    if (seats.join() !== lobby.seats.join()) void host.update({ seats })
  }, [host, lobby, members])

  if (L.load.status === 'loading') {
    return (
      <p className="text-muted" role="status">
        {t.lobby.loading}
      </p>
    )
  }
  if (L.load.status !== 'ok' || !lobby) {
    const missing = L.load.status === 'missing'
    return (
      <section>
        <h1 className="text-2xl font-bold">{missing ? t.lobby.missingTitle : t.lobby.errorTitle}</h1>
        <p className="mt-2 text-muted">{missing ? t.lobby.missingNote : t.lobby.errorNote}</p>
      </section>
    )
  }

  const names = new Map<string, string>(members.map((m) => [m.uid, m.name]))
  for (const p of lobby.session?.players ?? []) names.set(p.id, p.name)
  const nameOf = (id: string) => names.get(id) ?? '?'
  const me = uid ? members.find((m) => m.uid === uid) : undefined

  if (lobby.status === 'open') {
    return me ? <WaitingRoom lobby={lobby} members={members} me={me} L={L} /> : <JoinForm lobby={lobby} code={code} />
  }

  if (lobby.status === 'playing' && lobby.game) {
    const seated = uid !== null && lobby.seats.includes(uid)
    return (
      <>
        {!seated && <p className="mb-3 rounded-lg bg-sunken px-3 py-2 text-sm">{t.lobby.watching}</p>}
        <Table
          lobby={lobby}
          game={lobby.game}
          me={seated ? uid : null}
          hand={seated ? (L.hand?.cards ?? null) : null}
          isHost={L.isHost}
          busy={L.busy}
          problem={L.problem}
          failed={L.failed}
          nameOf={nameOf}
          submit={(a) => void L.submit(a)}
          nextRound={() => void host?.nextRound()}
          endGame={() => void host?.end()}
        />
      </>
    )
  }

  const session = lobby.session
  return (
    <section>
      <h1 className="text-2xl font-bold">{t.lobby.closedTitle}</h1>
      <p className="mt-2 text-muted">{t.lobby.closedNote}</p>
      {session && session.rounds.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-semibold">{t.common.scores}</h2>
          <ScoreTable session={session} person={(id) => ({ id, name: nameOf(id) })} />
          <h2 className="mt-6 mb-2 font-semibold">{t.common.settleUp}</h2>
          <SettleUp session={session} person={(id) => ({ id, name: nameOf(id) })} />
        </>
      )}
    </section>
  )
}

const field = 'h-11 min-w-0 flex-1 rounded-lg bg-surface px-3 outline-none ring-1 ring-line focus:ring-2 focus:ring-accent'

function JoinForm({ lobby, code }: { lobby: Lobby; code: string }) {
  const t = useT()
  const user = useStore((s) => s.user)
  const [name, setName] = useState(() => savedName() || (user?.name.split(' ')[0] ?? '').slice(0, MAX_NAME))
  const [working, setWorking] = useState(false)
  const [failed, setFailed] = useState(false)
  const trimmed = name.trim()
  const full = lobby.seats.length >= MAX_ONLINE

  async function join() {
    if (!trimmed) return
    setWorking(true)
    setFailed(false)
    saveName(trimmed)
    try {
      await (await import('../../data/online')).joinLobby(code, trimmed)
    } catch {
      setFailed(true)
    }
    setWorking(false)
  }

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="text-2xl font-bold">{t.lobby.joinTitle}</h1>
      <p className="mt-1 text-muted">{t.lobby.title(code)}</p>
      <label className="mt-6 block font-semibold" htmlFor="join-name">
        {t.online.yourName}
      </label>
      <input
        id="join-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={MAX_NAME}
        autoComplete="nickname"
        className={`${field} mt-2 w-full`}
      />
      {full && <p className="mt-4 text-muted">{t.lobby.full(MAX_ONLINE)}</p>}
      {failed && (
        <p className="mt-4 text-bad" role="alert">
          {t.online.failed}
        </p>
      )}
      <BottomBar>
        <Button variant="primary" className="h-13 w-full text-lg" disabled={!trimmed || working || full} onClick={join}>
          {working ? t.online.working : t.lobby.join}
        </Button>
      </BottomBar>
    </section>
  )
}

type WaitingProps = { lobby: Lobby; members: Member[]; me: Member; L: ReturnType<typeof useLobby> }

/** Before the game: the invite link, who has joined in seating order, and the host's start button. */
function WaitingRoom({ lobby, members, me, L }: WaitingProps) {
  const t = useT()
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const repo = useStore((s) => s.repo)
  const { host, isHost } = L
  const byId = new Map(members.map((m) => [m.uid, m]))
  const seats = lobby.seats.filter((id) => byId.has(id))
  const watchers = members.filter((m) => !lobby.seats.includes(m.uid))
  const hostName = byId.get(lobby.hostUid)?.name ?? '?'
  const small = 'h-9 w-9 rounded-lg bg-sunken text-lg disabled:opacity-40'

  function move(i: number, by: number) {
    const next = [...seats]
    ;[next[i], next[i + by]] = [next[i + by]!, next[i]!]
    void host?.update({ seats: next })
  }

  async function leave() {
    await L.online?.removeMember(lobby.id, me.uid)
    navigate('/online')
  }

  async function start() {
    if (!host) return
    repo.saveSettings({ ...settings, defaultConfig: lobby.config })
    await host.start(members, fmtDate(Date.now()))
  }

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="text-2xl font-bold">{t.lobby.title(lobby.id)}</h1>
      <Invite code={lobby.id} />

      <h2 className="mt-6 font-semibold">{t.lobby.seated}</h2>
      <p className="mt-1 mb-3 text-sm text-muted">{t.lobby.seatingNote}</p>
      <ol className="divide-y divide-line rounded-xl bg-surface">
        {seats.map((id, i) => {
          const m = byId.get(id)!
          return (
            <li key={id} className="flex min-h-13 items-center gap-3 px-3 py-2">
              <span className="tabular w-4 text-sm text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {m.name}
                {id === lobby.hostUid && <span className="ml-2 text-sm font-normal text-muted">{t.lobby.host}</span>}
                {id === me.uid && <span className="ml-2 text-sm font-normal text-muted">{t.lobby.you}</span>}
              </span>
              {isHost && (
                <>
                  <button className={small} disabled={i === 0 || !host} onClick={() => move(i, -1)} aria-label={t.seating.moveUp(m.name)}>
                    ↑
                  </button>
                  <button className={small} disabled={i === seats.length - 1 || !host} onClick={() => move(i, 1)} aria-label={t.seating.moveDown(m.name)}>
                    ↓
                  </button>
                  {id !== lobby.hostUid && (
                    <button className={small} onClick={() => void L.online?.removeMember(lobby.id, id)} aria-label={t.lobby.remove(m.name)}>
                      ×
                    </button>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ol>
      {watchers.length > 0 && <p className="mt-2 text-sm text-muted">{t.lobby.full(MAX_ONLINE)}</p>}

      {isHost ? (
        <details className="mt-6 rounded-xl bg-surface">
          <summary className="cursor-pointer px-3 py-3 font-semibold">{t.common.dealAndMoney}</summary>
          <div className="border-t border-line px-3 py-4">
            <ConfigEditor config={lobby.config} onChange={(config) => void host?.update({ config })} playerCount={seats.length} showStartCards />
          </div>
        </details>
      ) : (
        <p className="mt-6 text-sm text-muted">
          {t.config.moneyFormula}: {lobby.config.formula}
        </p>
      )}

      {!isHost && (
        <Button variant="quiet" className="mt-4 self-start px-0" onClick={leave}>
          {t.lobby.leave}
        </Button>
      )}

      <BottomBar>
        {isHost ? (
          <>
            <p className="mb-2 text-sm text-muted">{t.lobby.hostNote}</p>
            <Button
              variant="primary"
              className="h-13 w-full text-lg"
              disabled={!host || seats.length < 2 || !isConfigValid(lobby.config)}
              onClick={start}
            >
              {seats.length < 2 ? t.lobby.needTwo : t.lobby.start(seats.length)}
            </Button>
          </>
        ) : (
          <p className="text-center text-muted" role="status">
            {t.lobby.waitingForHost(hostName)}
          </p>
        )}
      </BottomBar>
    </section>
  )
}

/** The link and code to send to the others, as on the share panel. */
function Invite({ code }: { code: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/lobby/${code}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is unavailable. The link is shown and can be selected by hand.
    }
  }

  async function send() {
    try {
      await navigator.share({ title: `Gursch: ${t.lobby.title(code)}`, url })
    } catch {
      // The share sheet was dismissed.
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-surface p-3">
      <p className="text-muted">{t.lobby.invite}</p>
      <p className="mt-3 select-all break-all rounded-lg bg-bg px-3 py-2 text-sm">{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={copy}>
          {copied ? t.share.copied : t.share.copyLink}
        </Button>
        {typeof navigator.share === 'function' && (
          <Button size="sm" onClick={send}>
            {t.share.send}
          </Button>
        )}
      </div>
    </div>
  )
}
