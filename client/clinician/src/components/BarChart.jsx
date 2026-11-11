import { Bar, BarChart as RBarChart, Cell, LabelList, ReferenceLine, XAxis, YAxis } from 'recharts'
import { useElementWidth } from '../hooks/useElementWidth'

const TEAL = '#0F766E'
const CORAL = '#E8553F'
const TRACK = '#EFEDE8'
const LABEL_WIDTH = 136
const VALUE_WIDTH = 52

/**
 * Horizontal coverage bars with a target line (recharts): teal at or above
 * the target, coral below, values on the right. The chart is decorative; the
 * same numbers are in a table for screen readers.
 */
export default function BarChart({ data, target = 90, caption }) {
  const [ref, width] = useElementWidth()
  const height = data.length * 38
  return (
    <figure className="m-0">
      <div ref={ref} aria-hidden="true" style={{ height }}>
        {width > 0 && (
          <RBarChart
            width={width}
            height={height}
            data={data}
            layout="vertical"
            margin={{ top: 0, right: VALUE_WIDTH, bottom: 0, left: 0 }}
            barCategoryGap={13}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={LABEL_WIDTH}
              axisLine={false}
              tickLine={false}
              tick={({ y, payload }) => (
                <text x={0} y={y} dy={4.5} textAnchor="start" fontSize={13} fontWeight={600} fill="#0F172A">
                  {payload.value}
                </text>
              )}
            />
            <Bar dataKey="value" barSize={12} radius={6} background={{ fill: TRACK, radius: 6 }} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.value >= target ? TEAL : CORAL} />
              ))}
              <LabelList
                dataKey="value"
                content={({ y, height: h, value }) => (
                  <text x={width - 2} y={y + h / 2} dy={4.5} textAnchor="end" fontSize={13} fontWeight={700} fill={value >= target ? TEAL : '#B4432F'}>
                    {value}%
                  </text>
                )}
              />
            </Bar>
            <ReferenceLine x={target} stroke="#475569" strokeWidth={1.5} />
          </RBarChart>
        )}
      </div>
      {/* A table ignores the 1px sr-only width, so the wrapper is what hides it. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Dose</th>
              <th scope="col">Coverage</th>
              <th scope="col">Against the {target}% target</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name}>
                <th scope="row">{d.name}</th>
                <td>{d.value}%</td>
                <td>{d.value >= target ? 'At or above target' : 'Below target'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
