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
          bg: "var(--theme-bg, #0b0f19)", // dynamic background
          surface: "var(--theme-surface, #161f30)", // dynamic surface cards
          surface2: "var(--theme-surface2, #222d41)", // dynamic inputs
          header: "var(--theme-header, #161f30)", // dynamic unique header background
          accent: "var(--theme-accent, #05AD98)", // dynamic primary action
          accentHover: "var(--theme-accent-hover, #048e7d)", // dynamic hover
          accentFg: "#ffffff", // white text on accent
          border: "var(--theme-border, #2a384e)", // dynamic borders
          muted: "var(--theme-muted, #ACBCBF)", // dynamic muted text
          foreground: "var(--theme-foreground, #F4FCFB)", // dynamic foreground text
        },
        status: {
          available: "#05AD98", // Vichy teal
          occupied: "#4AB5B5", // Neptune soft teal
          attention: "#EF4444",
          green: "#05AD98",
          yellow: "#F59E0B",
          red: "#EF4444",
          blue: "#0474C4", // Sapphire deep blue
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
