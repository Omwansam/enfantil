import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate } from '../utils/dates'

const TEAL = '#0F766E'

function ticksFor(max) {
  const step = max <= 12 ? 3 : max <= 36 ? 6 : 12
  const end = Math.max(step, Math.ceil(max / step) * step)
  const out = []
  for (let m = 0; m <= end; m += step) out.push(m)
  return out
}

/** Weight or height by age (months), for the infant profile (D6). */
export default function GrowthChart({ points, metric }) {
  const unit = metric === 'weight' ? 'kg' : 'cm'
  const data = points
    .filter((p) => (metric === 'weight' ? p.weightKg : p.heightCm))
    .map((p) => ({ x: Number(p.ageMonths.toFixed(2)), value: metric === 'weight' ? p.weightKg : p.heightCm, date: p.date, ageLabel: p.ageLabel }))
  if (data.length === 0) return <p className="py-10 text-center text-[14px] text-slate-600">No {metric} recorded yet.</p>
  const ticks = ticksFor(data[data.length - 1].x)
  const values = data.map((d) => d.value)
  const step = metric === 'weight' ? 2 : 10
  const yMin = Math.max(0, Math.floor(Math.min(...values) / step) * step)
  const yMax = Math.ceil(Math.max(...values) / step) * step + (Math.max(...values) % step === 0 ? step : 0)
  return (
    <div
      role="img"
      aria-label={`${metric === 'weight' ? 'Weight' : 'Height'} chart: ${data.map((d) => `${formatDate(d.date)} ${d.value} ${unit}`).join('; ')}`}
      className="h-[220px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke="#ECEAE5" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, ticks[ticks.length - 1]]}
            ticks={ticks}
            tickFormatter={(m) => (m === 0 ? 'Birth' : `${m} mo`)}
            tick={{ fill: '#556070', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E7E5E0' }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) => `${v} ${unit}`}
            tick={{ fill: '#556070', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: '#CCFBF1', strokeWidth: 2 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-xl border border-line bg-white px-3 py-2 text-[13px] shadow-pop">
                  <p className="font-semibold text-ink">
                    {payload[0].payload.value} {unit}
                  </p>
                  <p className="text-muted">
                    {formatDate(payload[0].payload.date)} · {payload[0].payload.ageLabel}
                  </p>
                </div>
              ) : null
            }
          />
          <Line
            type="linear"
            dataKey="value"
            stroke={TEAL}
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={{ r: 4.5, fill: '#fff', stroke: TEAL, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: TEAL }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
