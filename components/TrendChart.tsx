"use client";

type Point = { x: number; y: number };

export function TrendChart({ points }: { points: Point[] }) {
  if (points.length < 2) return null;
  const width = 640;
  const height = 220;
  const pad = 28;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0;
  const maxY = 100;

  const sx = (x: number) =>
    pad + ((x - minX) / Math.max(1, maxX - minX)) * (width - pad * 2);
  const sy = (y: number) =>
    height - pad - ((y - minY) / (maxY - minY)) * (height - pad * 2);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(" ");

  const lastY = points[points.length - 1].y;
  const firstY = points[0].y;
  const trendUp = lastY >= firstY;
  const stroke = trendUp ? "#10b981" : "#ef4444";

  return (
    <div className="mt-3 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line
              x1={pad}
              x2={width - pad}
              y1={sy(t)}
              y2={sy(t)}
              stroke="#1a2140"
              strokeDasharray="2 4"
            />
            <text
              x={pad - 6}
              y={sy(t) + 3}
              fontSize="10"
              fill="#7a85a3"
              textAnchor="end"
            >
              {t}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3" fill={stroke} />
        ))}
      </svg>
    </div>
  );
}
