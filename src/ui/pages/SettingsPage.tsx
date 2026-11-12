import { useRef, useState } from 'react'
import { backupFileName, exportBackup, parseBackup } from '../../data/backup'
import { firebaseConfigured } from '../../data/config'
import { importLocal, markImport, pendingImport } from '../../data/migrate'
import { localRepo, signIn, signOut, snapshotOf, SYNC_UNREACHABLE, useStore } from '../../data/store'
import { setLanguageChoice, useLanguage, useT } from '../../i18n'
import type { LanguageChoice } from '../../i18n'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Segmented } from '../components/Controls'

export function useImport() {
  const user = useStore((s) => s.user)
  const loading = useStore((s) => s.loading)
  const repo = useStore((s) => s.repo)
  const players = useStore((s) => s.players)
  const sessions = useStore((s) => s.sessions)
  const settings = useStore((s) => s.settings)
  const local = snapshotOf(localRepo)
  if (!user || loading || !local) return null
  const account = { players, sessions, settings }
  const pending = pendingImport(local, account)
  return {
    uid: user.uid,
    players: pending.players.length,
    sessions: pending.sessions.length,
    run: () => {
      const done = importLocal(local, account, repo)
      markImport(user.uid, 'done')
      return done
    },
  }
}

/** Everything that is about the app rather than a game: the account, language, screen, backup and deleting data. */
export function SettingsPage() {
  const user = useStore((s) => s.user)
  const syncError = useStore((s) => s.syncError)
  const pending = useImport()
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState<{ players: number; sessions: number } | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setFailed(false)
    try {
      await action()
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const syncMessage = syncError === SYNC_UNREACHABLE ? t.account.unreachable : syncError

  return (
    <section>
      <h1 className="text-2xl font-bold">{t.nav.settings}</h1>

      <h2 className="mt-5 font-semibold">{t.account.title}</h2>

      {!firebaseConfigured ? (
        <p className="mt-2 text-muted">{t.account.notConfigured}</p>
      ) : user ? (
        <>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-surface p-3">
            <Avatar name={user.name || t.account.signedIn} avatar={user.photo} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{user.name || t.account.signedIn}</div>
              <div className="truncate text-sm text-muted">{user.email}</div>
            </div>
          </div>
          <p className="mt-3 text-muted">{t.account.synced}</p>
          {syncMessage && (
            <p className="mt-3 text-bad" role="alert">
              {t.account.syncProblem(syncMessage)}
            </p>
          )}

          {pending && pending.players + pending.sessions > 0 && (
            <div className="mt-5 rounded-xl bg-surface p-3">
              <p>{t.account.notInAccount(pending.players, pending.sessions)}</p>
              <Button className="mt-3" onClick={() => setCopied(pending.run())}>
                {t.account.copy}
              </Button>
            </div>
          )}
          {copied && (
            <p className="mt-3 text-good" role="status">
              {t.account.copied(copied.players, copied.sessions)}
            </p>
          )}

          <Button className="mt-6" disabled={busy} onClick={() => run(signOut)}>
            {t.account.signOut}
          </Button>
          <p className="mt-2 text-sm text-muted">{t.account.afterSignOut}</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-muted">{t.account.noAccountNeeded}</p>
          <Button variant="primary" className="mt-3" disabled={busy} onClick={() => run(signIn)}>
            {t.account.signInGoogle}
          </Button>
          {syncMessage && (
            <p className="mt-3 text-bad" role="alert">
              {syncMessage}
            </p>
          )}
        </>
      )}
      {failed && (
        <p className="mt-3 text-bad" role="alert">
          {t.account.failed}
        </p>
      )}

      <LanguagePicker />
      <Backup />
    </section>
  )
}

function LanguagePicker() {
  const t = useT()
  const choice = useLanguage((s) => s.choice)
  return (
    <>
      <h2 className="mt-8 mb-2 font-semibold">{t.language.title}</h2>
      <Segmented<LanguageChoice>
        label={t.language.title}
        value={choice}
        onChange={setLanguageChoice}
        options={[
          { value: 'auto', label: t.language.automatic },
          // Each language is named in itself, so it can be found from the other one.
          { value: 'en', label: 'English' },
          { value: 'sv', label: 'Svenska' },
        ]}
      />
      <p className="mt-2 text-sm text-muted">{t.language.note}</p>
    </>
  )
}

type BackupResult = { tone: 'good' | 'bad'; text: string }

/** Saves the active data to a JSON file and adds the records of such a file back. */
function Backup() {
  const t = useT()
  const user = useStore((s) => s.user)
  const repo = useStore((s) => s.repo)
  const players = useStore((s) => s.players)
  const sessions = useStore((s) => s.sessions)
  const settings = useStore((s) => s.settings)
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<BackupResult | null>(null)
  const data = { players, sessions, settings }

  function download() {
    const url = URL.createObjectURL(new Blob([exportBackup(data)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName()
    link.click()
    URL.revokeObjectURL(url)
    setResult(null)
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let backup: ReturnType<typeof parseBackup>
    try {
      backup = parseBackup(await file.text())
    } catch {
      backup = 'damaged'
    }
    if (typeof backup === 'string') return setResult({ tone: 'bad', text: t.backup[backup] })
    const added = importLocal(backup, data, repo)
    setResult(
      added.players + added.sessions > 0
        ? { tone: 'good', text: t.backup.imported(added.players, added.sessions) }
        : { tone: 'good', text: t.backup.nothingNew },
    )
  }

  return (
    <>
      <h2 className="mt-8 mb-2 font-semibold">{t.backup.title}</h2>
      <p className="text-muted">{user ? t.backup.noteAccount : t.backup.noteDevice}</p>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" tabIndex={-1} aria-hidden onChange={pick} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={download} disabled={players.length + sessions.length === 0}>
          {t.backup.export}
        </Button>
        <Button onClick={() => fileRef.current?.click()}>{t.backup.import}</Button>
      </div>
      <p className="mt-2 text-sm text-muted">{t.backup.importNote}</p>
      {result && (
        <p className={`mt-3 ${result.tone === 'good' ? 'text-good' : 'text-bad'}`} role={result.tone === 'good' ? 'status' : 'alert'}>
          {result.text}
        </p>
      )}
    </>
  )
}
