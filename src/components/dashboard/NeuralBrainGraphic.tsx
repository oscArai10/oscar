const NEURONS = [
  { cx: 95, cy: 108 },
  { cx: 108, cy: 128 },
  { cx: 148, cy: 112 },
  { cx: 163, cy: 158 },
  { cx: 122, cy: 165 },
  { cx: 178, cy: 202 },
  { cx: 132, cy: 178 },
  { cx: 90, cy: 165 },
];

const CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 5],
  [1, 4],
  [4, 6],
  [4, 7],
  [6, 3],
];

/** Glowing neural/circuit brain — visual centerpiece of the PULSE assistant card, matching the reference dashboard's AI Engine Overview panel. */
export function NeuralBrainGraphic() {
  return (
    <svg
      viewBox="0 0 280 280"
      className="h-40 w-40 sm:h-48 sm:w-48"
      aria-hidden="true"
    >
      <defs>
        <filter id="brain-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="brain-glow-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <radialGradient id="brain-base-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="brain-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* light beam feeding the base glow */}
      <rect x="130" y="150" width="20" height="90" fill="url(#brain-beam)" />

      {/* base energy glow, mirrors the reference's glowing pedestal under the brain */}
      <ellipse cx="140" cy="248" rx="72" ry="14" fill="url(#brain-base-glow)" />
      <ellipse
        cx="140"
        cy="246"
        rx="34"
        ry="6"
        fill="#00D4FF"
        opacity="0.7"
        filter="url(#brain-glow-soft)"
      />

      {/* brain silhouette */}
      <path
        d="M140 38
           C102 38 72 66 66 104
           C61 136 74 158 64 182
           C56 200 62 218 80 224
           C94 228 104 216 118 222
           C130 227 136 240 150 238
           C164 236 166 222 180 220
           C194 218 206 226 216 216
           C226 206 216 192 222 176
           C228 158 242 148 236 122
           C230 98 210 84 196 72
           C182 60 168 38 140 38 Z"
        fill="none"
        stroke="#22D3EE"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#brain-glow)"
        opacity="0.9"
      />

      {/* cortex fold lines */}
      <g fill="none" stroke="#38BDF8" strokeWidth="1.25" opacity="0.6" filter="url(#brain-glow)">
        <path d="M90 90 C100 100 95 115 105 125 C115 135 110 150 120 160" />
        <path d="M130 66 C140 82 135 98 145 114 C155 130 150 146 160 160 C170 176 165 190 175 204" />
        <path d="M100 158 C110 168 120 164 130 174 C140 184 150 180 160 190" />
        <path d="M190 100 C182 115 190 128 182 142" />
      </g>

      {/* connecting lines between neuron nodes */}
      <g stroke="#00D4FF" strokeWidth="1" opacity="0.5">
        {CONNECTIONS.map(([a, b], i) => (
          <line
            key={i}
            x1={NEURONS[a].cx}
            y1={NEURONS[a].cy}
            x2={NEURONS[b].cx}
            y2={NEURONS[b].cy}
          />
        ))}
      </g>

      {/* pulsing neuron nodes */}
      {NEURONS.map((n, i) => (
        <circle
          key={i}
          cx={n.cx}
          cy={n.cy}
          r="3.2"
          fill="#00D4FF"
          filter="url(#brain-glow)"
          className="oscar-neuron-pulse"
          style={{ animationDelay: `${i * 0.25}s` }}
        />
      ))}

      <style>{`
        .oscar-neuron-pulse {
          animation: oscar-neuron-pulse 2.4s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes oscar-neuron-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </svg>
  );
}
