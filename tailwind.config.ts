import type { Config } from "tailwindcss";

// CafeFlow design system — Clean, modern, hand-crafted palette.
// Neutral slate base (no tinted backgrounds) + refined teal accent.
// Designed for data-dense operational dashboards with proper WCAG AA contrast.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "rgb(var(--theme-bg-rgb, 9 9 11) / <alpha-value>)",             // #09090b zinc-950
          surface: "rgb(var(--theme-surface-rgb, 24 24 27) / <alpha-value>)",   // #18181b zinc-900
          surface2: "rgb(var(--theme-surface2-rgb, 39 39 42) / <alpha-value>)", // #27272a zinc-800
          header: "rgb(var(--theme-header-rgb, 9 9 11) / <alpha-value>)",       // #09090b — same as bg for seamless look
          accent: "rgb(var(--theme-accent-rgb, 20 184 166) / <alpha-value>)",   // #14b8a6 teal-500
          accentHover: "rgb(var(--theme-accent-hover-rgb, 13 148 136) / <alpha-value>)", // #0d9488 teal-600
          accentText: "rgb(var(--theme-accent-text-rgb, 20 184 166) / <alpha-value>)",   // teal-500
          accentFg: "#ffffff",
          border: "rgb(var(--theme-border-rgb, 63 63 70) / <alpha-value>)",     // #3f3f46 zinc-700
          muted: "rgb(var(--theme-muted-rgb, 161 161 170) / <alpha-value>)",    // #a1a1aa zinc-400
          foreground: "rgb(var(--theme-foreground-rgb, 250 250 250) / <alpha-value>)", // #fafafa zinc-50
        },
        status: {
          available: "#10b981",      // emerald-500
          occupied: "#06b6d4",       // cyan-500
          occupiedText: "rgb(var(--status-occupied-text-rgb, 8 145 178) / <alpha-value>)", // cyan-600
          attention: "#ef4444",      // red-500
          green: "#10b981",          // emerald-500
          greenSolid: "#059669",     // emerald-600
          greenText: "rgb(var(--status-green-text-rgb, 16 185 129) / <alpha-value>)", // emerald-500
          yellow: "#f59e0b",         // amber-500
          yellowText: "rgb(var(--status-yellow-text-rgb, 245 158 11) / <alpha-value>)", // amber-500
          red: "#ef4444",            // red-500
          redSolid: "#dc2626",       // red-600
          redText: "rgb(var(--status-red-text-rgb, 239 68 68) / <alpha-value>)", // red-500
          blue: "#3b82f6",           // blue-500
          blueText: "rgb(var(--status-blue-text-rgb, 59 130 246) / <alpha-value>)", // blue-500
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      zIndex: {
        banner: "20",
        nav: "30",
        dropdown: "40",
        modal: "50",
        toast: "60",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        pop: "0 10px 25px -5px rgb(0 0 0 / 0.25), 0 8px 10px -6px rgb(0 0 0 / 0.15)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        in: "fade-in-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
        fade: "fade-in 0.2s ease-out both",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
