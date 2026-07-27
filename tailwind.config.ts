import type { Config } from "tailwindcss";

// CafeFlow design system — telebirr × WeChat.
//
// The palette is lifted from the two apps the product is modelled on:
//   • WeChat  — brand green #07C160 (pressed #06AD56), page gray #EDEDED,
//               white cards, #E5E5E5 separators, #888888 secondary text,
//               link blue #576B95, error red #FA5151, warning orange #FA9D3B.
//   • telebirr — Ethio Telecom green; deep green chrome/header with white text,
//               gold/amber highlights on balances and promos.
//
// Every Tailwind hue the app already uses is remapped onto that system, so a
// stray `slate-800` or `emerald-500` anywhere in the codebase still lands
// inside the telebirr/WeChat palette instead of Tailwind's stock colors.

/** WeChat neutral ramp — page gray, white cards, hairline separators. */
const wxGray = {
  50: "#FAFAFA",
  100: "#F7F7F7",
  200: "#E5E5E5", // WeChat separator
  300: "#D9D9D9",
  400: "#B2B2B2", // placeholder text
  500: "#888888", // secondary text
  600: "#7F7F7F",
  700: "#4C4C4C",
  800: "#2E2E2E", // dark-mode separator
  900: "#1A1A1A", // dark-mode card
  950: "#111111", // dark-mode page
};

/** WeChat brand green blended with telebirr's deeper Ethio Telecom green. */
const wxGreen = {
  50: "#E8F9F0",
  100: "#C6F0DA",
  200: "#9AE5BE",
  300: "#62D89B",
  400: "#2ECC7C",
  500: "#07C160", // WeChat brand green
  600: "#06AD56", // WeChat pressed
  700: "#059247", // telebirr green
  800: "#03733A", // AA-safe green text on light
  900: "#025C2E",
  950: "#013D1F",
};

/** WeChat warning orange / telebirr gold. */
const wxAmber = {
  50: "#FFF6E9",
  100: "#FDE9CA",
  200: "#FBD79E",
  300: "#FCC46E",
  400: "#FBB04F",
  500: "#FA9D3B", // WeChat orange
  600: "#E8871F",
  700: "#C06E12",
  800: "#96560E", // AA-safe amber text on light
  900: "#6F400B",
  950: "#422607",
};

/** WeChat error red. */
const wxRed = {
  50: "#FEECEC",
  100: "#FCD6D5",
  200: "#FBB4B3",
  300: "#F98A89",
  400: "#FA6A69",
  500: "#FA5151", // WeChat error
  600: "#E64340", // WeUI warn
  700: "#C5302E", // AA-safe red text on light
  800: "#9E2523",
  900: "#7A1D1B",
  950: "#451010",
};

/** WeChat link blue (#576B95) — used for links and informational states. */
const wxBlue = {
  50: "#EEF1F7",
  100: "#DDE3EE",
  200: "#BCC6DC",
  300: "#97A6C6",
  400: "#7688AE",
  500: "#576B95", // WeChat link blue
  600: "#4A5C82",
  700: "#3D4C6C",
  800: "#313C56",
  900: "#252E42",
  950: "#161B27",
};

/** telebirr secondary teal — occupied/in-progress states. */
const tbTeal = {
  50: "#E6F7FA",
  100: "#C2ECF2",
  200: "#8EDBE7",
  300: "#57C7D8",
  400: "#2BB8CD",
  500: "#10AEC2",
  600: "#0E9AAD",
  700: "#0E7C8C",
  800: "#0C6270",
  900: "#0A4D58",
  950: "#063039",
};

/** Muted violet for the 4th chart series — reads calm next to green/blue. */
const wxViolet = {
  50: "#F1EEFA",
  100: "#DFD8F3",
  200: "#C3B7E8",
  300: "#A794DC",
  400: "#8B76CE",
  500: "#6C5FA8",
  600: "#5C5090",
  700: "#4B4176",
  800: "#3B335C",
  900: "#2C2645",
  950: "#1A1729",
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Every neutral hue collapses onto the WeChat gray ramp.
        slate: wxGray,
        zinc: wxGray,
        gray: wxGray,
        neutral: wxGray,
        stone: wxGray,
        // Every green-ish hue collapses onto the WeChat/telebirr green.
        green: wxGreen,
        emerald: wxGreen,
        teal: wxGreen,
        lime: wxGreen,
        // Warm hues → WeChat orange / telebirr gold.
        amber: wxAmber,
        yellow: wxAmber,
        orange: wxAmber,
        // Error hues → WeChat red.
        red: wxRed,
        rose: wxRed,
        pink: wxRed,
        // Informational hues → WeChat link blue.
        blue: wxBlue,
        sky: wxBlue,
        indigo: wxBlue,
        cyan: tbTeal,
        violet: wxViolet,
        purple: wxViolet,
        fuchsia: wxViolet,

        // Named palette, in case a component wants to reach for it directly.
        wechat: wxGreen,
        telebirr: wxGreen,

        brand: {
          // Fallbacks below mirror the LIGHT theme in globals.css so any page
          // rendered before/outside AppShell still paints telebirr × WeChat.
          bg: "rgb(var(--theme-bg-rgb, 237 237 237) / <alpha-value>)",             // #EDEDED WeChat page
          surface: "rgb(var(--theme-surface-rgb, 255 255 255) / <alpha-value>)",   // #FFFFFF card
          surface2: "rgb(var(--theme-surface2-rgb, 247 247 247) / <alpha-value>)", // #F7F7F7 inset
          header: "rgb(var(--theme-header-rgb, 0 135 63) / <alpha-value>)",        // #00873F telebirr green chrome
          accent: "rgb(var(--theme-accent-rgb, 7 193 96) / <alpha-value>)",        // #07C160 WeChat green
          accentHover: "rgb(var(--theme-accent-hover-rgb, 6 173 86) / <alpha-value>)", // #06AD56 pressed
          accentText: "rgb(var(--theme-accent-text-rgb, 3 115 58) / <alpha-value>)",   // #03733A AA on light
          accentFg: "#ffffff",
          border: "rgb(var(--theme-border-rgb, 229 229 229) / <alpha-value>)",     // #E5E5E5 separator
          muted: "rgb(var(--theme-muted-rgb, 136 136 136) / <alpha-value>)",       // #888888 secondary
          foreground: "rgb(var(--theme-foreground-rgb, 25 25 25) / <alpha-value>)", // #191919 primary
        },
        status: {
          available: "#07C160",      // WeChat green
          occupied: "#10AEC2",       // telebirr teal
          occupiedText: "rgb(var(--status-occupied-text-rgb, 14 124 140) / <alpha-value>)", // #0E7C8C
          attention: "#FA5151",      // WeChat red
          green: "#07C160",
          greenSolid: "#06AD56",
          greenText: "rgb(var(--status-green-text-rgb, 3 115 58) / <alpha-value>)",   // #03733A
          yellow: "#FA9D3B",         // WeChat orange
          yellowText: "rgb(var(--status-yellow-text-rgb, 150 86 14) / <alpha-value>)", // #96560E
          red: "#FA5151",
          redSolid: "#E64340",
          redText: "rgb(var(--status-red-text-rgb, 197 48 46) / <alpha-value>)",     // #C5302E
          blue: "#576B95",           // WeChat link blue
          blueText: "rgb(var(--status-blue-text-rgb, 87 107 149) / <alpha-value>)",  // #576B95
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
        // WeChat surfaces are near-flat — separation comes from the gray page
        // behind white cards, not from heavy drop shadows.
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        pop: "0 8px 24px -6px rgb(0 0 0 / 0.16), 0 4px 8px -4px rgb(0 0 0 / 0.08)",
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
