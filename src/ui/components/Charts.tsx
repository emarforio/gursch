import { useEffect, useRef, useState } from 'react'
import { cardLabel } from '../../domain/scoring'
import { fmtSigned } from '../format'

const SERIES_COUNT = 8

/** Chart colour for the nth player. Players past the eighth share a neutral colour. */
export function seriesColor(index: number): string {
  return index >= 0 && index < SERIES_COUNT ? `var(--series-${index + 1})` : 'var(--muted)'
}

function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

function niceTicks(min: number, max: number, target = 4): number[] {
  const span = max - min || 1
  const raw = span / target
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  const ticks: number[] = []
  const end = Math.ceil(max / step - 1e-9) * step
  for (let v = Math.floor(min / step + 1e-9) * step; v <= end + step * 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return ticks
}

export type Series = { id: string; name: string; color: string; values: number[] }

/** Running balance per player. values[0] is the starting point before round 1. */
export function LineChart({ series }: { series: Series[] }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const count = Math.max(...series.map((s) => s.values.length), 1)
  const last = count - 1
  const direct = series.length <= 4
  const H = 220
  const m = { t: 10, r: direct ? 12 + Math.min(90, Math.max(...series.map((s) => s.name.length), 1) * 8) : 12, b: 26, l: 40 }
  const iw = Math.max(width - m.l - m.r, 10)
  const ih = H - m.t - m.b
  const all = series.flatMap((s) => s.values)
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all))
  const lo = ticks[0]!
  const hi = ticks[ticks.length - 1]!
  const x = (i: number) => m.l + (last === 0 ? 0 : (i / last) * iw)
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo || 1)) * ih
  const xStep = Math.max(1, Math.ceil(last / 6))
  const xTicks = Array.from({ length: last + 1 }, (_, i) => i).filter((i) => i > 0 && (i % xStep === 0 || i === last))

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - box.left - m.l) / iw) * last)
    setHover(Math.min(last, Math.max(0, i)))
  }

  // Spread end labels apart so they do not overlap.
  const labels = series
    .map((s) => ({ s, y: y(s.values[s.values.length - 1] ?? 0) }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < labels.length; i++) labels[i]!.y = Math.max(labels[i]!.y, labels[i - 1]!.y + 14)

  const hovered = hover === null ? null : [...series].sort((a, b) => (b.values[hover] ?? 0) - (a.values[hover] ?? 0))

  return (
    <div>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label="Running balance per player after each round"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
            style={{ touchAction: 'pan-y', display: 'block' }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={m.l}
                  x2={m.l + iw}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? 'var(--muted)' : 'var(--line)'}
                  strokeWidth={1}
                />
                <text x={m.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                  {t}
                </text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                {i}
              </text>
            ))}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke="var(--muted)" strokeWidth={1} />}
            {series.map((s) => (
              <g key={s.id}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                />
                {hover !== null && s.values[hover] !== undefined && (
                  <circle cx={x(hover)} cy={y(s.values[hover]!)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                )}
              </g>
            ))}
            {direct &&
              labels.map(({ s, y: ly }) => (
                <text key={s.id} x={m.l + iw + 8} y={ly + 4} fontSize={12} fill="var(--text)">
                  {s.name}
                </text>
              ))}
          </svg>
        )}
        {hover !== null && hovered && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg bg-bg px-2.5 py-2 text-xs shadow-md ring-1 ring-line"
            style={x(hover) > width / 2 ? { right: width - x(hover) + 10 } : { left: x(hover) + 10 }}
          >
            <div className="mb-1 text-muted">{hover === 0 ? 'Start' : `After round ${hover}`}</div>
            {hovered.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="flex-1">{s.name}</span>
                <span className="tabular font-semibold">{fmtSigned(s.values[hover] ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {series.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

/** How often a player finished on each card. One series, so no legend. */
export function CardBars({ counts, color }: { counts: Record<number, number>; color: string }) {
  const [ref, width] = useWidth()
  const [picked, setPicked] = useState<number | null>(null)
  const total = VALUES.reduce((s, v) => s + (counts[v] ?? 0), 0)
  const top = Math.max(1, ...VALUES.map((v) => counts[v] ?? 0))
  const H = 150
  const m = { t: 8, b: 22 }
  const ih = H - m.t - m.b
  const band = width / VALUES.length
  const bw = Math.max(band - 2, 2)

  const shown = picked ?? null
  const readout =
    shown === null
      ? 'Tap a bar for the count.'
      : `${cardLabel(shown)}: ${counts[shown] ?? 0} of ${total} rounds (${total ? Math.round(((counts[shown] ?? 0) / total) * 100) : 0}%)`

  return (
    <div>
      <p className="mb-1 text-sm text-muted" aria-live="polite">
        {readout}
      </p>
      <div ref={ref}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label="Final cards, how often each value occurred" style={{ display: 'block' }}>
            <line x1={0} x2={width} y1={m.t + ih} y2={m.t + ih} stroke="var(--line)" />
            {VALUES.map((v, i) => {
              const c = counts[v] ?? 0
              const h = (c / top) * ih
              const x0 = i * band + 1
              const r = Math.min(4, h, bw / 2)
              const yTop = m.t + ih - h
              return (
                <g
                  key={v}
                  onPointerEnter={() => setPicked(v)}
                  onPointerDown={() => setPicked(v)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && setPicked(null)}
                >
                  <rect x={i * band} y={0} width={band} height={H} fill="transparent" />
                  {c > 0 && (
                    <path
                      d={`M${x0},${m.t + ih} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + bw - r} Q${x0 + bw},${yTop} ${x0 + bw},${yTop + r} V${m.t + ih} Z`}
                      fill={color}
                      opacity={picked === null || picked === v ? 1 : 0.45}
                    />
                  )}
                  <text
                    x={i * band + band / 2}
                    y={H - 6}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={picked === v ? 700 : 400}
                    fill={picked === v ? 'var(--text)' : 'var(--muted)'}
                  >
                    {cardLabel(v)}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
