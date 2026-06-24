import type { Config } from "tailwindcss";

// CafeFlow design system — "Real-Time / Operations" palette (ui-ux-pro-max).
// Deep-slate base + green accent + green/amber/red status colors, tuned for
// data-dense, scannable service-floor dashboards (dark only).
// Token NAMES are kept stable (brand-*, status-*) so every page adopts the new
// palette automatically; values below are the new ops system.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#020617", // app background — deep slate
          surface: "#0F172A", // cards / panels
          surface2: "#1E293B", // inputs / raised surfaces
          accent: "#22C55E", // primary action / brand green
          accentHover: "#16A34A", // accent hover/pressed
          accentFg: "#03130A", // text/icon on accent (high contrast)
          border: "#22304A", // hairline borders
          muted: "#64748B", // muted / secondary text
          foreground: "#F8FAFC", // primary text
        },
        status: {
          // Operational status — green/amber/red, distinct in dark mode.
          available: "#22C55E",
          occupied: "#F59E0B",
          attention: "#EF4444",
          green: "#22C55E",
          yellow: "#F59E0B",
          red: "#EF4444",
          blue: "#3B82F6",
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
