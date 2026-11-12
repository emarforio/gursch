import { dealCap, maxDeal } from '../../domain/deal'
import { evaluateFormula, validateFormula } from '../../domain/formula'
import type { DealRule, SessionConfig } from '../../domain/types'
import { useT } from '../../i18n'
import { fmtMoney, formulaProblem } from '../format'
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
  const t = useT()
  const players = Math.max(playerCount, 2)
  const top = maxDeal(players)
  const rule = config.dealRule
  const setRule = (patch: Partial<DealRule>) => onChange({ ...config, dealRule: { ...rule, ...patch } })
  const problem = validateFormula(config.formula)
  const error = problem && formulaProblem(t, problem)

  let example: string | null = null
  if (!error) {
    try {
      example = fmtMoney(evaluateFormula(config.formula, EXAMPLE))
    } catch {
      example = t.config.exampleNotANumber
    }
  }

  return (
    <div className="space-y-5">
      {showStartCards && (
        <div className="flex items-center justify-between gap-3">
          <span>{t.config.firstRound}</span>
          <Stepper
            label={t.config.firstRound}
            value={Math.min(config.startCards, top)}
            min={1}
            max={top}
            onChange={(v) => onChange({ ...config, startCards: v })}
          />
        </div>
      )}

      <div>
        <div className="mb-2">{t.config.followingRounds}</div>
        <Segmented
          label={t.config.dealRule}
          value={rule.mode}
          onChange={(mode) => setRule({ mode, fixed: mode === 'fixed' ? (rule.fixed ?? config.startCards) : rule.fixed })}
          options={[
            { value: 'difference', label: t.config.difference },
            { value: 'loserScore', label: t.config.loserScore },
            { value: 'fixed', label: t.config.fixed },
          ]}
        />
        <p className="mt-2 text-sm text-muted">
          {rule.mode === 'difference' && t.config.differenceNote}
          {rule.mode === 'loserScore' && t.config.loserScoreNote}
          {rule.mode === 'fixed' && t.config.fixedNote}
        </p>
        {rule.mode === 'fixed' ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span>{t.config.cardsEachRound}</span>
            <Stepper
              label={t.config.cardsEachRound}
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
              {t.config.keepOneBelow}
              <span className="block text-sm text-muted">
                {t.config.atMost(dealCap(rule, players), players)}
              </span>
            </span>
          </label>
        )}
      </div>

      <div>
        <label htmlFor="formula" className="mb-2 block">
          {t.config.moneyFormula}
        </label>
        <input
          id="formula"
          value={config.formula}
          onChange={(e) => onChange({ ...config, formula: e.target.value })}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error !== null}
          aria-describedby="formula-note"
          className="h-11 w-full rounded-lg bg-bg px-3 outline-none ring-1 ring-line focus:ring-2 focus:ring-accent"
        />
        <p id="formula-note" aria-live="polite" className={`mt-1 text-sm ${error ? 'text-bad' : 'text-muted'}`}>
          {error ?? t.config.example(example ?? '')}
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
          {t.config.help}
        </p>
      </div>
    </div>
  )
}

export function isConfigValid(config: SessionConfig): boolean {
  return validateFormula(config.formula) === null
}
