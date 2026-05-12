type Props = {
  data: number[]
  color: string
  height?: number
  width?: number
}

export function Sparkline({ data, color, height = 28, width = 88 }: Props) {
  if (!data.length) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = data.length > 1 ? width / (data.length - 1) : 0

  const points = data.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * (height - 2) - 1
    return [x, y]
  })

  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ")

  const areaPath = `${path} L ${(width).toFixed(2)} ${height} L 0 ${height} Z`
  const last = points[points.length - 1]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="trend"
      style={{ display: "block", overflow: "visible" }}
    >
      <path d={areaPath} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {last && (
        <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
      )}
    </svg>
  )
}
