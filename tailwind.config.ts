import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — LOCKED palette from the reference image
        "bg-primary": "#050816",
        "bg-secondary": "#0A1025",
        "bg-card": "#0F172A",
        "bg-sidebar": "#081120",
        // Primary accent (blue/cyan)
        "accent-blue": "#2563EB",
        "accent-cyan": "#00D4FF",
        "accent-cyan-blue": "#22D3EE",
        "accent-blue-glow": "#38BDF8",
        // Secondary accent (purple)
        "accent-purple": "#7C3AED",
        "accent-purple-neon": "#9333EA",
        "accent-purple-bright": "#A855F7",
        // Status
        "status-green": "#22C55E",
        "status-green-bright": "#00FF88",
        "status-gold": "#F59E0B",
        "status-red": "#EF4444",
        // Text
        "text-primary": "#FFFFFF",
        "text-secondary": "#CBD5E1",
        "text-muted": "#94A3B8",
      },
      borderColor: {
        neon: "rgba(0,212,255,0.15)",
      },
      backgroundColor: {
        glass: "rgba(255,255,255,0.05)",
      },
      boxShadow: {
        neon: "0 0 20px rgba(0,212,255,0.4)",
      },
      backgroundImage: {
        "gradient-main": "linear-gradient(135deg,#050816,#0A1025)",
      },
      fontFamily: {
        heading: ["var(--font-syne)", "sans-serif"],
        body: ["var(--font-exo2)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
