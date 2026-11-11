import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate } from '../utils/dates'

const TEAL = '#0F766E'

function monthTicks(maxMonths) {
  const step = maxMonths <= 12 ? 3 : maxMonths <= 36 ? 6 : 12
  const end = Math.max(step, Math.ceil(maxMonths / step) * step)
  const ticks = []
  for (let m = 0; m <= end; m += step) ticks.push(m)
  return ticks
}

function monthLabel(m) {
  if (m === 0) return 'Birth'
  if (m < 24) return `${m} months`
  return `${m / 12} years`
}

function valueDomain(values, step) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  return [Math.max(0, Math.floor(min / step) * step), Math.ceil(max / step) * step]
}

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-[13px] shadow-pop">
      <p className="font-semibold text-ink">
        {p.value.toFixed(1)} {unit}
      </p>
      <p className="text-muted">
        {formatDate(p.date)} · {p.ageLabel}
      </p>
    </div>
  )
}

/** Weight or height over age. `points` must be sorted oldest first. */
export default function GrowthChart({ points, metric }) {
  const unit = metric === 'weight' ? 'kg' : 'cm'
  const data = points.map((m) => ({
    x: Number(m.ageMonths.toFixed(2)),
    value: metric === 'weight' ? m.weightKg : m.heightCm,
    date: m.date,
    ageLabel: m.ageLabel,
  }))
  const ticks = monthTicks(data[data.length - 1]?.x ?? 0)
  const [yMin, yMax] = valueDomain(
    data.map((d) => d.value),
    metric === 'weight' ? 2 : 10,
  )
  const yTicks = []
  for (let v = yMin; v <= yMax; v += metric === 'weight' ? 2 : 10) yTicks.push(v)
  const last = data.length - 1
  const summary = data.map((d) => `${formatDate(d.date)}: ${d.value} ${unit}`).join('; ')

  return (
    <div role="img" aria-label={`${metric === 'weight' ? 'Weight' : 'Height'} chart. ${summary}`} className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke="#ECEAE5" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, ticks[ticks.length - 1]]}
            ticks={ticks}
            tickFormatter={monthLabel}
            tick={{ fill: '#556070', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E7E5E0' }}
          />
          <YAxis
            domain={[yMin, yMax]}
            ticks={yTicks}
            tickFormatter={(v) => (v === yMax ? `${v} ${unit}` : String(v))}
            tick={{ fill: '#556070', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: '#CCFBF1', strokeWidth: 2 }} />
          <Line
            type="linear"
            dataKey="value"
            stroke={TEAL}
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={({ cx, cy, index }) => (
              <circle key={index} cx={cx} cy={cy} r={index === last ? 6 : 5} fill={index === last ? TEAL : '#fff'} stroke={TEAL} strokeWidth={2} />
            )}
            activeDot={{ r: 7, fill: TEAL, stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
