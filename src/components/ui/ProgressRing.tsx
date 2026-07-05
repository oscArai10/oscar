interface ProgressRingProps {
  value: number; // 0-100
  color: string;
  label: string;
  size?: number;
}

/** Circular resource-usage ring, matches CPU/GPU/RAM/Storage rings in the reference. */
export function ProgressRing({ value, color, label, size = 96 }: ProgressRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-heading text-xl font-bold text-text-primary">
          {value}%
        </div>
      </div>
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}
