/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Exo 2", "system-ui", "sans-serif"],
        display: ["Exo 2", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        gov: {
          blue: "#0f4c75",
          blueLight: "#1b6ca8",
          blueMuted: "#e8f4fc",
          white: "#ffffff",
          border: "#94a3b8",
          borderStrong: "#64748b",
        },
        ops: {
          teal: "#0d9488",
          cyan: "#06b6d4",
          blue: "#0ea5e9",
          slate: "#0f172a",
          glass: "rgba(255,255,255,0.08)",
          glassDark: "rgba(15,23,42,0.6)",
        },
        flood: {
          normal: "#22d3ee",
          warning: "#fbbf24",
          critical: "#ef4444",
          dark: "#0c4a6e",
          glow: "#67e8f9",
        },
      },
      backgroundImage: {
        "gradient-ops": "linear-gradient(135deg, #0f4c75 0%, #0d9488 50%, #06b6d4 100%)",
        "gradient-ops-subtle": "linear-gradient(180deg, rgba(13,148,136,0.15) 0%, rgba(6,182,212,0.1) 100%)",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset",
        "card-dark": "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset",
        glass: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.2) inset",
        "glass-dark": "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08) inset",
        glow: "0 0 20px rgba(6,182,212,0.4), 0 0 40px rgba(6,182,212,0.2)",
        "glow-red": "0 0 16px rgba(239,68,68,0.5)",
        "glow-cyan": "0 0 12px rgba(34,211,238,0.5)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "slide-lang": "slide-lang 0.25s ease-out",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        "slide-lang": {
          "0%": { transform: "translateX(-4px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
