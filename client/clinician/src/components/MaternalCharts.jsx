import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate } from '../utils/dates'

const TEAL = '#0F766E'
const INDIGO = '#3730A3'
const CORAL = '#B4432F'
const axis = { tick: { fill: '#556070', fontSize: 12 }, tickLine: false }

function TipBox({ active, payload, render }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return <div className="rounded-xl border border-line bg-white px-3 py-2 text-[13px] shadow-pop">{render(p)}</div>
}

/** Weight across antenatal visits, by week of pregnancy. */
export function WeightChart({ rows }) {
  const values = rows.map((r) => r.weightKg)
  const min = Math.floor(Math.min(...values) / 2) * 2 - 2
  const max = Math.ceil(Math.max(...values) / 2) * 2 + 2
  return (
    <div role="img" aria-label={`Weight chart. ${rows.map((r) => `${r.weeks} weeks: ${r.weightKg} kg`).join('; ')}`} className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: -6 }}>
          <CartesianGrid vertical={false} stroke="#ECEAE5" />
          <XAxis
            dataKey="weeks"
            type="number"
            domain={[8, 40]}
            ticks={[12, 20, 26, 30, 34, 38]}
            tickFormatter={(w) => `${w} wk`}
            axisLine={{ stroke: '#E7E5E0' }}
            {...axis}
          />
          <YAxis domain={[min, max]} tickFormatter={(v) => `${v} kg`} axisLine={false} width={56} {...axis} />
          <Tooltip
            cursor={{ stroke: '#CCFBF1', strokeWidth: 2 }}
            content={
              <TipBox
                render={(p) => (
                  <>
                    <p className="font-semibold text-ink">
                      {p.weightKg} kg {p.gain > 0 && <span className="font-normal text-slate-600">(+{p.gain} kg)</span>}
                    </p>
                    <p className="text-muted">
                      {formatDate(p.date)} · {p.ga} weeks
                    </p>
                  </>
                )}
              />
            }
          />
          <Line
            type="linear"
            dataKey="weightKg"
            name="Weight"
            stroke={TEAL}
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={{ r: 5, fill: '#fff', stroke: TEAL, strokeWidth: 2 }}
            activeDot={{ r: 7, fill: TEAL }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Systolic and diastolic blood pressure with the normal range shaded (below 140/90). */
export function BloodPressureChart({ rows }) {
  return (
    <div
      role="img"
      aria-label={`Blood pressure chart. ${rows.map((r) => `${r.weeks} weeks: ${r.systolic}/${r.diastolic}`).join('; ')}. Normal is below 140/90.`}
      className="h-[260px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: -6 }}>
          <CartesianGrid vertical={false} stroke="#ECEAE5" />
          <ReferenceArea
            y1={60}
            y2={89}
            fill="#F0FDFA"
            fillOpacity={1}
            ifOverflow="extendDomain"
            label={{ value: 'Normal diastolic (under 90)', position: 'insideBottomLeft', fill: '#115E59', fontSize: 11 }}
          />
          <ReferenceArea
            y1={90}
            y2={139}
            fill="#ECFDF5"
            fillOpacity={0.7}
            ifOverflow="extendDomain"
            label={{ value: 'Normal systolic (under 140)', position: 'insideTopLeft', fill: '#047857', fontSize: 11 }}
          />
          <ReferenceLine y={140} stroke={CORAL} strokeDasharray="4 4" label={{ value: '140', position: 'right', fill: CORAL, fontSize: 11 }} />
          <ReferenceLine y={90} stroke={CORAL} strokeDasharray="4 4" label={{ value: '90', position: 'right', fill: CORAL, fontSize: 11 }} />
          <XAxis
            dataKey="weeks"
            type="number"
            domain={[8, 40]}
            ticks={[12, 20, 26, 30, 34, 38]}
            tickFormatter={(w) => `${w} wk`}
            axisLine={{ stroke: '#E7E5E0' }}
            {...axis}
          />
          <YAxis domain={[50, 160]} ticks={[60, 80, 100, 120, 140, 160]} axisLine={false} width={44} {...axis} />
          <Tooltip
            cursor={{ stroke: '#CCFBF1', strokeWidth: 2 }}
            content={
              <TipBox
                render={(p) => (
                  <>
                    <p className="font-semibold text-ink">
                      {p.systolic}/{p.diastolic} mmHg
                    </p>
                    <p className="text-muted">
                      {formatDate(p.date)} · {p.ga} weeks
                    </p>
                  </>
                )}
              />
            }
          />
          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12, color: '#475569' }} />
          <Line
            type="linear"
            dataKey="systolic"
            name="Systolic (top number)"
            stroke={TEAL}
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={{ r: 5, fill: '#fff', stroke: TEAL, strokeWidth: 2 }}
          />
          <Line
            type="linear"
            dataKey="diastolic"
            name="Diastolic (bottom number)"
            stroke={INDIGO}
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={{ r: 5, fill: '#fff', stroke: INDIGO, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
