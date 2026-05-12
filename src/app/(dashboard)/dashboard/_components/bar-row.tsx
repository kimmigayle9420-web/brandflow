type Row = { l: string; v: number }

type Props = {
  rows: Row[]
  accent: string
  max?: number
}

export function BarRow({ rows, accent, max }: Props) {
  const cap = max ?? Math.max(...rows.map((r) => r.v), 1)

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const pct = Math.round((row.v / cap) * 100)
        return (
          <li key={row.l} className="grid items-center gap-3" style={{ gridTemplateColumns: "110px 1fr 44px" }}>
            <span className="text-xs" style={{ color: "#5C4F46" }}>
              {row.l}
            </span>
            <span
              className="block h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(45,45,45,0.07)" }}
              aria-hidden
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: accent,
                  transition: "width 240ms ease-out",
                }}
              />
            </span>
            <span
              className="text-[11px] tabular-nums text-right"
              style={{ color: "#2D2D2D", fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, monospace)" }}
            >
              {row.v}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
