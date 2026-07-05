interface LiveLineChartProps {
  data: number[];
  xLabels: string[];
  yMax: number;
  yStep: number;
  color?: string;
  height?: number;
}

/** Glowing green activity line chart, matches the reference "Transaction Activity" card. */
export function LiveLineChart({
  data,
  xLabels,
  yMax,
  yStep,
  color = "#22C55E",
  height = 160,
}: LiveLineChartProps) {
  const width = 600;
  const chartId = "live-line-chart-glow";

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (value / yMax) * height;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += yStep) yTicks.push(v);

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-1 font-mono text-[10px] text-text-muted">
          {yTicks
            .slice()
            .reverse()
            .map((tick) => (
              <span key={tick}>{tick >= 1000 ? `${tick / 1000}K` : tick}</span>
            ))}
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ height }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id={`${chartId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d={areaPath} fill={`url(#${chartId}-fill)`} stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            filter={`url(#${chartId}-glow)`}
          />
        </svg>
      </div>
      <div className="mt-1 flex justify-between pl-8 font-mono text-[10px] text-text-muted">
        {xLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
