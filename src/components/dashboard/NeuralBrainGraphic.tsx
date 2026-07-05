import { Brain } from "lucide-react";

const NEURON_DOTS = [
  { top: "18%", left: "30%" },
  { top: "28%", left: "62%" },
  { top: "48%", left: "22%" },
  { top: "55%", left: "70%" },
  { top: "68%", left: "45%" },
];

/** Glowing neural brain — visual centerpiece of the PULSE assistant card, matching the reference dashboard's AI Engine Overview panel. */
export function NeuralBrainGraphic() {
  return (
    <div className="relative flex h-40 w-40 shrink-0 items-center justify-center sm:h-48 sm:w-48">
      {/* base energy glow, mirrors the reference's glowing pedestal under the brain */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="brain-base-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="brain-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect x="92" y="90" width="16" height="80" fill="url(#brain-beam)" />
        <ellipse cx="100" cy="178" rx="52" ry="10" fill="url(#brain-base-glow)" />
      </svg>

      {/* soft blurred glow layer behind the icon */}
      <Brain
        size={112}
        strokeWidth={1.25}
        className="absolute text-accent-cyan opacity-70 blur-md"
        aria-hidden="true"
      />

      {/* crisp brain icon on top, drop-shadow gives the neon edge */}
      <Brain
        size={112}
        strokeWidth={1.25}
        className="relative z-10 text-accent-cyan-blue"
        style={{ filter: "drop-shadow(0 0 8px rgba(0,212,255,0.85))" }}
        aria-hidden="true"
      />

      {/* pulsing neuron nodes scattered over the icon for the circuit feel */}
      {NEURON_DOTS.map((pos, i) => (
        <span
          key={i}
          className="oscar-neuron-pulse absolute z-20 h-1.5 w-1.5 rounded-full bg-accent-cyan"
          style={{
            top: pos.top,
            left: pos.left,
            boxShadow: "0 0 6px 2px rgba(0,212,255,0.9)",
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      <style>{`
        .oscar-neuron-pulse {
          animation: oscar-neuron-pulse 2.4s ease-in-out infinite;
        }
        @keyframes oscar-neuron-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.6); }
        }
      `}</style>
    </div>
  );
}
