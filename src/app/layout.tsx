import type { Metadata } from "next";
import { Playfair_Display, Karla } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

// Display headings — Playfair Display; body/UI — Karla (ui-ux-pro-max pairing).
const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Karla({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CafeFlow SaaS",
  description: "Multi-tenant, multi-branch cafe management for Ethiopian cafes (PostgreSQL edition)",
  icons: {
    icon: "/LOGO.jpg",
  },
};

// Applies the saved theme before first paint so every page — including the ones
// outside AppShell (landing, login, register, QR menu) — starts on the right
// half of the telebirr × WeChat palette instead of flashing the wrong one.
const THEME_INIT = `(function(){try{var m=localStorage.getItem('themeMode');if(m!=='dark'&&m!=='light'){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;if(m==='dark'){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_INIT below stamps `dark` + color-scheme on
    // <html> before React hydrates, so this element legitimately differs from the
    // server markup. It only suppresses the warning for <html> itself.
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
