/** @param {{ label: string, value: number, max: number, colorClass?: string, sublabel?: string }} props */
export function CssBarColumn({ label, value, max, colorClass = 'bg-amber-500', sublabel }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <div className="relative flex h-28 w-full max-w-[2.5rem] items-end justify-center rounded-md bg-chai-100/80">
        <div
          className={`w-full rounded-t-md transition-all duration-500 ${colorClass}`}
          style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
          title={`${label}: ${value}`}
        />
      </div>
      <span className="max-w-full truncate text-center text-[9px] font-medium text-chai-600">{label}</span>
      {sublabel != null && (
        <span className="text-[8px] text-chai-400">{sublabel}</span>
      )}
    </div>
  )
}

/**
 * @param {{ items: { label: string, value: number, sublabel?: string }[], palette?: string[] }} props
 */
export function CssBarChart({ items, palette }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  const defaultPalette = [
    'bg-amber-500', 'bg-amber-600', 'bg-orange-600', 'bg-yellow-600',
    'bg-chai-500', 'bg-chai-600', 'bg-amber-700', 'bg-orange-700',
  ]
  const colors = palette || defaultPalette
  return (
    <div className="flex w-full items-end justify-between gap-1 overflow-x-auto pb-1">
      {items.map((item, idx) => (
        <CssBarColumn
          key={item.label}
          label={item.label}
          value={item.value}
          max={max}
          colorClass={colors[idx % colors.length]}
          sublabel={item.sublabel}
        />
      ))}
    </div>
  )
}

/**
 * @param {{ segments: { label: string, value: number, color: string }[], size?: number, hole?: number }} props
 */
export function CssDonutChart({ segments, size = 160, hole = 0.58 }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) {
    return (
      <div
        className="mx-auto rounded-full bg-chai-100"
        style={{ width: size, height: size }}
      />
    )
  }
  let acc = 0
  const parts = segments.map((seg) => {
    const start = acc
    const frac = seg.value / total
    acc += frac
    return { ...seg, start, end: acc }
  })
  const grad = parts
    .map((p) => `${p.color} ${(p.start * 360).toFixed(3)}deg ${(p.end * 360).toFixed(3)}deg`)
    .join(', ')
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div
        className="rounded-full shadow-inner ring-2 ring-chai-100"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${grad})`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-chai-100"
        style={{
          width: size * hole,
          height: size * hole,
        }}
      >
        <span className="text-center text-xs font-bold text-chai-800">100%</span>
      </div>
    </div>
  )
}

/**
 * @param {{ points: { x: number, y: number }[], strokeClass?: string, fillClass?: string, pad?: number }} props
 */
export function CssLineChart({ points, strokeClass = 'stroke-amber-600', fillClass = 'fill-amber-200/40', pad = 8 }) {
  if (!points.length) {
    return <div className="h-32 w-full rounded-xl bg-chai-50" />
  }
  const ys = points.map((p) => p.y)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys, 1)
  const minX = 0
  const maxX = Math.max(points.length - 1, 1)
  const W = 280
  const H = 120
  const scaleX = (x) => pad + ((x - minX) / (maxX - minX)) * (W - pad * 2)
  const scaleY = (y) => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - pad * 2)
  const poly = points
    .map((p, i) => `${scaleX(i).toFixed(1)},${scaleY(p.y).toFixed(1)}`)
    .join(' ')
  const baseY = H - pad
  const area = `0,${baseY} ${poly} ${W},${baseY}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full overflow-visible" preserveAspectRatio="none">
      <polygon points={area} className={fillClass} />
      <polyline
        points={poly}
        fill="none"
        className={strokeClass}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={scaleX(i)}
          cy={scaleY(p.y)}
          r={3}
          className="fill-white stroke-amber-700"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}
