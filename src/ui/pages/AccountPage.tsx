import { useState } from 'react'
import { firebaseConfigured } from '../../data/config'
import { importLocal, markImport, pendingImport } from '../../data/migrate'
import { localRepo, signIn, signOut, snapshotOf, useStore } from '../../data/store'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'

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

export function describeImport(players: number, sessions: number): string {
  const parts = [
    players > 0 && `${players} ${players === 1 ? 'player' : 'players'}`,
    sessions > 0 && `${sessions} ${sessions === 1 ? 'session' : 'sessions'}`,
  ].filter(Boolean)
  return parts.join(' and ')
}

export function AccountPage() {
  const user = useStore((s) => s.user)
  const syncError = useStore((s) => s.syncError)
  const pending = useImport()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('That did not work. Check your connection and try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">Account</h1>

      {!firebaseConfigured ? (
        <p className="mt-3 text-muted">
          Sync is not set up in this build. Everything is saved on this device only, and the app works the same otherwise.
        </p>
      ) : user ? (
        <>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
            <Avatar name={user.name} avatar={user.photo} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{user.name}</div>
              <div className="truncate text-sm text-muted">{user.email}</div>
            </div>
          </div>
          <p className="mt-3 text-muted">
            Your players and sessions are saved to this account and kept in sync on every device where you sign in.
          </p>
          {syncError && <p className="mt-3 text-bad">Sync problem: {syncError}</p>}

          {pending && pending.players + pending.sessions > 0 && (
            <div className="mt-5 rounded-xl bg-surface p-3">
              <p>
                This device has {describeImport(pending.players, pending.sessions)} saved from before you signed in that{' '}
                {pending.players + pending.sessions === 1 ? 'is' : 'are'} not in your account.
              </p>
              <Button
                className="mt-3"
                onClick={() => {
                  const done = pending.run()
                  setCopied(describeImport(done.players, done.sessions))
                }}
              >
                Copy to my account
              </Button>
            </div>
          )}
          {copied && <p className="mt-3 text-good">Copied {copied} to your account.</p>}

          <Button className="mt-6" disabled={busy} onClick={() => run(signOut)}>
            Sign out
          </Button>
          <p className="mt-2 text-sm text-muted">After signing out you see the data saved on this device again.</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-muted">
            You do not need an account. Signing in keeps your players and sessions in sync between your devices.
          </p>
          <Button variant="primary" className="mt-5" disabled={busy} onClick={() => run(signIn)}>
            Sign in with Google
          </Button>
          {syncError && <p className="mt-3 text-bad">{syncError}</p>}
        </>
      )}
      {error && <p className="mt-3 text-bad">{error}</p>}
    </section>
  )
}
