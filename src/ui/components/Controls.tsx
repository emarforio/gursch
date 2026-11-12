import { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import { Button } from './Button'

export function Stepper(props: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  const { value, min, max, onChange, label } = props
  const t = useT()
  const btn = 'h-10 w-10 rounded-lg bg-sunken text-xl font-medium disabled:opacity-40'
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={t.common.fewer}>
        −
      </button>
      <span className="tabular w-8 text-center text-lg font-semibold" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={t.common.more}>
        +
      </button>
    </div>
  )
}

export function Segmented<T extends string | number>(props: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="inline-flex rounded-lg bg-sunken p-1" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === props.value}
          onClick={() => props.onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            o.value === props.value ? 'bg-surface text-text shadow-sm' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Asks for a second tap before running a destructive action. */
export function ConfirmButton(props: { label: string; onConfirm: () => void; danger?: boolean }) {
  const t = useT()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Button
      size="sm"
      variant={armed || props.danger ? 'danger' : 'plain'}
      className={armed ? 'bg-sunken' : ''}
      onClick={() => {
        if (armed) props.onConfirm()
        setArmed(!armed)
      }}
    >
      {armed ? t.common.tapAgain : props.label}
    </Button>
  )
}
