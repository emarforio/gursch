import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { firebaseConfigured } from '../../data/config'
import { useStore } from '../../data/store'
import { useT } from '../../i18n'
import { BottomBar } from '../components/BottomBar'
import { Button } from '../components/Button'
import { MAX_NAME } from '../components/SeatingEditor'
import { saveName, savedName } from '../online/useLobby'

/** A one-line text field. In a row it shares the width; alone it is as wide as a short name needs. */
const field = 'h-11 min-w-0 rounded-lg bg-surface px-3 outline-none ring-1 ring-line focus:ring-2 focus:ring-accent'

/** Start a lobby for an online game, or join one with a code. */
export function OnlinePage() {
  const t = useT()
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const settings = useStore((s) => s.settings)
  const [name, setName] = useState(() => savedName() || (user?.name.split(' ')[0] ?? '').slice(0, MAX_NAME))
  const [code, setCode] = useState('')
  const [working, setWorking] = useState(false)
  const [failed, setFailed] = useState(false)
  const trimmed = name.trim()

  if (!firebaseConfigured) {
    return (
      <section>
        <h1 className="text-2xl font-bold">{t.online.title}</h1>
        <p className="mt-2 text-muted">{t.online.notConfigured}</p>
      </section>
    )
  }

  async function create() {
    if (!trimmed) return
    setWorking(true)
    setFailed(false)
    saveName(trimmed)
    try {
      const online = await import('../../data/online')
      const id = await online.createLobby(trimmed, settings.defaultConfig)
      navigate(`/lobby/${id}`)
    } catch {
      setFailed(true)
      setWorking(false)
    }
  }

  function join(e: FormEvent) {
    e.preventDefault()
    const c = code.trim().toLowerCase()
    if (c) navigate(`/lobby/${c}`)
  }

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="text-2xl font-bold">{t.online.title}</h1>
      <p className="mt-2 text-muted">{t.online.intro}</p>

      <label className="mt-6 block font-semibold" htmlFor="online-name">
        {t.online.yourName}
      </label>
      <input
        id="online-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={MAX_NAME}
        autoComplete="nickname"
        className={`${field} mt-2 block w-full max-w-xs`}
      />

      <form onSubmit={join} className="mt-8">
        <label className="block font-semibold" htmlFor="online-code">
          {t.online.haveCode}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="online-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.online.code}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className={`${field} flex-1`}
          />
          <Button type="submit" disabled={!code.trim()}>
            {t.online.join}
          </Button>
        </div>
      </form>

      {failed && (
        <p className="mt-4 text-bad" role="alert">
          {t.online.failed}
        </p>
      )}

      <BottomBar>
        <Button variant="primary" className="h-13 w-full text-lg" disabled={!trimmed || working} onClick={create}>
          {working ? t.online.working : t.online.create}
        </Button>
      </BottomBar>
    </section>
  )
}
