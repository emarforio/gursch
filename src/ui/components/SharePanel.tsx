import { useState } from 'react'
import { Link } from 'react-router-dom'
import { firebaseConfigured } from '../../data/config'
import { useStore } from '../../data/store'
import type { Session } from '../../domain/types'
import { useT } from '../../i18n'
import { Button } from './Button'

/** Turns live sharing of a session on and off and shows the link to send. */
export function SharePanel({ session }: { session: Session }) {
  const user = useStore((s) => s.user)
  const repo = useStore((s) => s.repo)
  const t = useT()
  const [copied, setCopied] = useState(false)
  if (!firebaseConfigured) return null

  const url = `${window.location.origin}/s/${session.id}`

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
      await navigator.share({ title: `Gursch: ${session.name}`, url })
    } catch {
      // The share sheet was dismissed.
    }
  }

  return (
    <div className="mt-6 rounded-xl bg-surface p-3">
      <h2 className="font-semibold">{t.share.title}</h2>
      {!user ? (
        <p className="mt-1 text-muted">
          <Link to="/account" className="text-accent underline">
            {t.share.signIn}
          </Link>{' '}
          {t.share.signInRest}
        </p>
      ) : session.ownerUid !== user.uid ? (
        <p className="mt-1 text-muted">{t.share.deviceOnly}</p>
      ) : !session.shared ? (
        <>
          <p className="mt-1 text-muted">{t.share.anyoneCan}</p>
          <Button className="mt-3" onClick={() => repo.saveSession({ ...session, shared: true })}>
            {t.share.create}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-1 text-muted">{t.share.anyoneCan}</p>
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
            <Button size="sm" onClick={() => repo.saveSession({ ...session, shared: false })}>
              {t.share.stop}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
