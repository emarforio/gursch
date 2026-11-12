import { useState } from 'react'
import { importAnswered, markImport } from '../../data/migrate'
import { useT } from '../../i18n'
import { useImport } from '../pages/AccountPage'
import { Button } from './Button'

/** Asks once, after the first sign-in on a device, whether to copy its local data into the account. */
export function ImportBanner() {
  const t = useT()
  const pending = useImport()
  const [, refresh] = useState(0)
  if (!pending || pending.players + pending.sessions === 0 || importAnswered(pending.uid)) return null

  return (
    <div className="mb-5 rounded-xl bg-surface p-3">
      <p className="font-semibold">{t.account.bannerTitle}</p>
      <p className="mt-1 text-sm text-muted">
        {t.account.bannerText(pending.players, pending.sessions)}
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            pending.run()
            refresh((n) => n + 1)
          }}
        >
          {t.account.copy}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            markImport(pending.uid, 'skipped')
            refresh((n) => n + 1)
          }}
        >
          {t.account.notNow}
        </Button>
      </div>
    </div>
  )
}
