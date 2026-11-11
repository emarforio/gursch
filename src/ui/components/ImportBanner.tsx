import { useState } from 'react'
import { importAnswered, markImport } from '../../data/migrate'
import { describeImport, useImport } from '../pages/AccountPage'
import { Button } from './Button'

/** Asks once, after the first sign-in on a device, whether to copy its local data into the account. */
export function ImportBanner() {
  const pending = useImport()
  const [, refresh] = useState(0)
  if (!pending || pending.players + pending.sessions === 0 || importAnswered(pending.uid)) return null

  return (
    <div className="mb-5 rounded-xl bg-surface p-3">
      <p className="font-semibold">Copy this device's data to your account?</p>
      <p className="mt-1 text-sm text-muted">
        This device has {describeImport(pending.players, pending.sessions)} saved from before you signed in. You can also do
        this later from the Account page.
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
          Copy to my account
        </Button>
        <Button
          size="sm"
          onClick={() => {
            markImport(pending.uid, 'skipped')
            refresh((n) => n + 1)
          }}
        >
          Not now
        </Button>
      </div>
    </div>
  )
}
