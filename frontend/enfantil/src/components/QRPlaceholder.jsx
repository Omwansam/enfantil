import { useMemo } from 'react'

const SIZE = 25

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function isFinder(x, y) {
  const inBox = (ox, oy) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7)
}

/**
 * QR-style placeholder, generated from `value` so each child's card looks
 * different. It is not a scannable code; the real one comes from the backend.
 */
export default function QRPlaceholder({ value, size = 128, className }) {
  const cells = useMemo(() => {
    let seed = hash(value)
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    const out = []
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const nearFinder = (x < 8 && y < 8) || (x > SIZE - 9 && y < 8) || (x < 8 && y > SIZE - 9)
        if (!nearFinder && rand() > 0.55) out.push([x, y])
      }
    }
    return out
  }, [value])

  const finder = (ox, oy) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width="7" height="7" fill="#0F172A" />
      <rect x={ox + 1} y={oy + 1} width="5" height="5" fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width="3" height="3" fill="#0F172A" />
    </g>
  )

  return (
    <div className={className}>
      <svg
        role="img"
        aria-label="QR code for checking this record (placeholder)"
        viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
        width={size}
        height={size}
        className="rounded-xl border border-line bg-white"
        shapeRendering="crispEdges"
      >
        <rect x="-2" y="-2" width={SIZE + 4} height={SIZE + 4} fill="#fff" />
        {cells.filter(([x, y]) => !isFinder(x, y)).map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0F172A" />
        ))}
        {finder(0, 0)}
        {finder(SIZE - 7, 0)}
        {finder(0, SIZE - 7)}
      </svg>
    </div>
  )
}
