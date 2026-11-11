import { dealCap, maxDeal } from '../../domain/deal'
import { evaluateFormula, validateFormula } from '../../domain/formula'
import type { DealRule, SessionConfig } from '../../domain/types'
import { fmtMoney } from '../format'
import { Segmented, Stepper } from './Controls'

const PRESETS = ['(max_score - min_score) * 2', 'max_score^2', '(max_score * min_score) / 100']

const EXAMPLE = { max_score: 13, min_score: 3, total: 40, players: 5 }

type Props = {
  config: SessionConfig
  onChange: (c: SessionConfig) => void
  playerCount: number
  showStartCards?: boolean
}

export function ConfigEditor({ config, onChange, playerCount, showStartCards }: Props) {
  const players = Math.max(playerCount, 2)
  const top = maxDeal(players)
  const rule = config.dealRule
  const setRule = (patch: Partial<DealRule>) => onChange({ ...config, dealRule: { ...rule, ...patch } })
  const error = validateFormula(config.formula)

  let example: string | null = null
  if (!error) {
    try {
      example = fmtMoney(evaluateFormula(config.formula, EXAMPLE))
    } catch {
      example = 'not a number'
    }
  }

  return (
    <div className="space-y-5">
      {showStartCards && (
        <div className="flex items-center justify-between gap-3">
          <span>Cards in the first round</span>
          <Stepper
            label="Cards in the first round"
            value={Math.min(config.startCards, top)}
            min={1}
            max={top}
            onChange={(v) => onChange({ ...config, startCards: v })}
          />
        </div>
      )}

      <div>
        <div className="mb-2">Cards in the following rounds</div>
        <Segmented
          label="Deal rule"
          value={rule.mode}
          onChange={(mode) => setRule({ mode, fixed: mode === 'fixed' ? (rule.fixed ?? config.startCards) : rule.fixed })}
          options={[
            { value: 'difference', label: 'Difference' },
            { value: 'loserScore', label: "Loser's score" },
            { value: 'fixed', label: 'Fixed' },
          ]}
        />
        <p className="mt-2 text-sm text-muted">
          {rule.mode === 'difference' && "The loser's score minus the winner's score."}
          {rule.mode === 'loserScore' && "As many cards as the loser's score."}
          {rule.mode === 'fixed' && 'The same number of cards every round.'}
        </p>
        {rule.mode === 'fixed' ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span>Cards each round</span>
            <Stepper
              label="Cards each round"
              value={Math.min(rule.fixed ?? config.startCards, top)}
              min={1}
              max={top}
              onChange={(v) => setRule({ fixed: v })}
            />
          </div>
        ) : (
          <label className="mt-3 flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 accent-(--accent)"
              checked={rule.capBelowMax > 0}
              onChange={(e) => setRule({ capBelowMax: e.target.checked ? 1 : 0 })}
            />
            <span>
              Keep one below the largest deal
              <span className="block text-sm text-muted">
                At most {dealCap(rule, players)} cards with {players} players.
              </span>
            </span>
          </label>
        )}
      </div>

      <div>
        <label htmlFor="formula" className="mb-2 block">
          Money formula
        </label>
        <input
          id="formula"
          value={config.formula}
          onChange={(e) => onChange({ ...config, formula: e.target.value })}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 w-full rounded-lg bg-bg px-3 outline-none ring-1 ring-line focus:ring-2 focus:ring-accent"
        />
        <p className={`mt-1 text-sm ${error ? 'text-bad' : 'text-muted'}`}>
          {error ?? `Loser on K (13), winner on 3: the loser owes ${example}.`}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...config, formula: p })}
              className="rounded-lg bg-sunken px-3 py-1.5 text-sm"
            >
              {p}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          You can use max_score, min_score, total and players, with + − * / ^ and brackets.
        </p>
      </div>
    </div>
  )
}

export function isConfigValid(config: SessionConfig): boolean {
  return validateFormula(config.formula) === null
}
