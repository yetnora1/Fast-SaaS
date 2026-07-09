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
          bg: "#0b0f19", // app background — Sapphire nightfall whisper dark
          surface: "#161f30", // cards / panels — Sapphire nightfall whisper medium
          surface2: "#222d41", // inputs / raised surfaces — Sapphire nightfall whisper light
          accent: "#05AD98", // primary action / brand minty green — Vichy teal
          accentHover: "#048e7d", // dark Vichy hover
          accentFg: "#ffffff", // white text on accent
          border: "#2a384e", // hairline borders — mix of Slate and Nightfall
          muted: "#ACBCBF", // muted / secondary text — Arctic reflection soft grey
          foreground: "#F4FCFB", // primary text — Arctic reflection ice white
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
