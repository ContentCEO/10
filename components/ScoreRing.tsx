export function ScoreRing({ value, size = 96 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color =
    v >= 75 ? "#10b981" : v >= 60 ? "#3a5fff" : v >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#1a2140"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        fill="none"
      />
    </svg>
  );
}
