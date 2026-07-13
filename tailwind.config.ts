import type { Config } from "tailwindcss";

// CafeFlow design system — "Real-Time / Operations" palette (ui-ux-pro-max).
// Deep-slate base + teal accent + green/amber/red status colors, tuned for
// data-dense, scannable service-floor dashboards (light + dark).
// Token NAMES are kept stable (brand-*, status-*) so every page adopts the new
// palette automatically. All accent values are dark enough that white text on
// them meets WCAG AA (>=4.5:1); AppShell overrides them per module/theme.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand tokens use RGB-triplet vars (`R G B`) so Tailwind opacity
        // modifiers (bg-brand-accent/15, border-brand-border/60, …) work.
        // AppShell sets --theme-*-rgb per module/theme; fallbacks below are the
        // default dark palette and serve pages without AppShell (landing, QR).
        brand: {
          bg: "rgb(var(--theme-bg-rgb, 11 15 25) / <alpha-value>)", // dynamic background (#0b0f19)
          surface: "rgb(var(--theme-surface-rgb, 22 31 48) / <alpha-value>)", // dynamic surface cards (#161f30)
          surface2: "rgb(var(--theme-surface2-rgb, 34 45 65) / <alpha-value>)", // dynamic inputs (#222d41)
          header: "rgb(var(--theme-header-rgb, 31 58 61) / <alpha-value>)", // header background (#1F3A3D)
          accent: "rgb(var(--theme-accent-rgb, 13 125 108) / <alpha-value>)", // primary action (#0d7d6c, white text passes AA)
          accentHover: "rgb(var(--theme-accent-hover-rgb, 10 101 88) / <alpha-value>)", // hover (#0a6558)
          accentText: "rgb(var(--theme-accent-text-rgb, 13 125 108) / <alpha-value>)", // accent-as-text: bright on dark, deep on light
          accentFg: "#ffffff", // white text on accent
          border: "rgb(var(--theme-border-rgb, 42 56 78) / <alpha-value>)", // dynamic borders (#2a384e)
          muted: "rgb(var(--theme-muted-rgb, 172 188 191) / <alpha-value>)", // muted text (#ACBCBF)
          foreground: "rgb(var(--theme-foreground-rgb, 244 252 251) / <alpha-value>)", // foreground text (#F4FCFB)
        },
        // status *Text tokens are themed per light/dark by AppShell (bright hue
        // on dark surfaces, deep hue on light) so status text stays >=4.5:1.
        status: {
          available: "#05AD98", // Vichy teal (dots/fills — 3:1 UI context)
          occupied: "#4AB5B5", // Neptune soft teal
          occupiedText: "rgb(var(--status-occupied-text-rgb, 38 118 118) / <alpha-value>)", // #267676
          attention: "#EF4444",
          green: "#05AD98",
          greenSolid: "#16803C", // solid fills carrying white text (5.02:1)
          greenText: "rgb(var(--status-green-text-rgb, 13 125 108) / <alpha-value>)", // #0d7d6c
          yellow: "#F59E0B",
          yellowText: "rgb(var(--status-yellow-text-rgb, 180 83 9) / <alpha-value>)", // #B45309
          red: "#EF4444", // dots, borders, /15 tints
          redSolid: "#DC2626", // solid fills carrying white text (4.83:1)
          redText: "rgb(var(--status-red-text-rgb, 185 28 28) / <alpha-value>)", // #B91C1C
          blue: "#0474C4", // Sapphire deep blue
          blueText: "rgb(var(--status-blue-text-rgb, 4 116 196) / <alpha-value>)", // #0474C4
        },
      },
      fontFamily: {
        // Display = Playfair Display (brand/headlines); body = Karla.
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      // Single z-index scale (skill: avoid arbitrary z-[9999]).
      zIndex: {
        banner: "20",
        nav: "30",
        dropdown: "40",
        modal: "50",
        toast: "60",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.30), 0 1px 3px 0 rgb(0 0 0 / 0.20)",
        pop: "0 12px 32px -8px rgb(0 0 0 / 0.55)",
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
