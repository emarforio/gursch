import { balances, settleUp } from '../../domain/ledger'
import type { Session, SessionPlayer } from '../../domain/types'
import { useT } from '../../i18n'
import { fmtMoney } from '../format'

export function SettleUp({ session, person }: { session: Session; person: (id: string) => SessionPlayer }) {
  const t = useT()
  const transfers = settleUp(balances(session.rounds))
  if (transfers.length === 0) return <p className="text-muted">{t.settle.nobody}</p>
  return (
    <ul className="divide-y divide-line rounded-xl bg-surface">
      {transfers.map((x) => (
        <li key={x.from + x.to} className="flex items-center justify-between px-3 py-2.5">
          <span>
            <span className="font-medium">{person(x.from).name}</span>
            <span className="text-muted"> {t.settle.pays} </span>
            <span className="font-medium">{person(x.to).name}</span>
          </span>
          <span className="tabular font-semibold">{fmtMoney(x.amount)}</span>
        </li>
      ))}
    </ul>
  )
}
