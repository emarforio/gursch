import { balances, settleUp } from '../../domain/ledger'
import type { Session, SessionPlayer } from '../../domain/types'
import { fmtMoney } from '../format'

export function SettleUp({ session, person }: { session: Session; person: (id: string) => SessionPlayer }) {
  const transfers = settleUp(balances(session.rounds))
  if (transfers.length === 0) return <p className="text-muted">Nobody owes anything.</p>
  return (
    <ul className="divide-y divide-line rounded-xl bg-surface">
      {transfers.map((t) => (
        <li key={t.from + t.to} className="flex items-center justify-between px-3 py-2.5">
          <span>
            <span className="font-medium">{person(t.from).name}</span>
            <span className="text-muted"> pays </span>
            <span className="font-medium">{person(t.to).name}</span>
          </span>
          <span className="tabular font-semibold">{fmtMoney(t.amount)}</span>
        </li>
      ))}
    </ul>
  )
}
