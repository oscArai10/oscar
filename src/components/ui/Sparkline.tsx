interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

/** Tiny trend line used in the corner of stat cards. */
export function Sparkline({
  data,
  color = "#00D4FF",
  width = 72,
  height = 28,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        points={points}
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
