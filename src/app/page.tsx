import Link from "next/link";
import { Fraunces, Noto_Serif_Ethiopic } from "next/font/google";
import { ArrowRightIcon, CheckCircleIcon } from "@/components/icons";

// Landing-page-only faces. The app keeps its own fonts.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const ethiopic = Noto_Serif_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["600"],
  display: "swap",
});

const TICKER = [
  "QR ordering",
  "Kitchen boards",
  "Cashier & till",
  "Stock & purchasing",
  "Shifts & payroll",
  "Owner reports",
  "English & አማርኛ",
];

const FEATURES = [
  {
    title: "QR self-ordering",
    body: "Guests scan the table card and order from a menu in Amharic or English. No app to install, no waving at a busy waiter.",
  },
  {
    title: "Kitchen & barista boards",
    body: "Tickets land on the prep board the second they are placed. New, preparing, ready. The floor and the kitchen read one queue.",
  },
  {
    title: "Cashier & till",
    body: "Payments, receipts, refunds, and a shift close that balances to the birr.",
  },
  {
    title: "Stock & purchasing",
    body: "Recipes draw down stock as orders fire. Purchases, suppliers and waste stay on the record instead of in someone's head.",
  },
  {
    title: "Shifts & payroll",
    body: "Eight roles, from waiter to owner. Each login opens one job, not a maze of menus.",
  },
  {
    title: "Owner reports",
    body: "Daily sales, best sellers, branch comparisons. Five minutes with your morning macchiato and you know how the café is doing.",
  },
];

const STEPS = [
  {
    title: "Register the café",
    body: "Create your account, add a branch, load the menu. It takes an afternoon, not a rollout plan.",
  },
  {
    title: "Print the table cards",
    body: "Every table gets its QR card. Every staff member gets a login scoped to their role.",
  },
  {
    title: "Open for service",
    body: "Orders, tickets, payments and stock counts start writing themselves down as you work.",
  },
];

const PLAN_INCLUDES = [
  "7 days free. No card, no commitment.",
  "Unlimited orders, tables and menu items",
  "All eight staff roles included",
  "Every branch under one account",
];

const RECEIPT_LINES: Array<[string, string]> = [
  ["1× Macchiato", "85"],
  ["2× Ful Special", "240"],
  ["1× Mango Juice", "120"],
  ["1× Sambusa", "60"],
];

// Torn thermal-paper edge for the receipt card.
const ZIGZAG = Array.from({ length: 16 }, (_, i) => `L${i * 20 + 10} 10 L${(i + 1) * 20} 0`).join(" ");

function Squiggle() {
  return (
    <svg
      className="absolute -bottom-2 left-0 h-3 w-full sm:-bottom-3 sm:h-4"
      viewBox="0 0 220 14"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M4 9 C60 3 150 2 216 7" stroke="var(--clay)" strokeWidth="5" strokeLinecap="round" />
      <path d="M12 12 C70 7 140 6 204 10" stroke="var(--clay)" strokeWidth="3" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

function Stamp() {
  return (
    <svg viewBox="0 0 120 120" className="lp-spin h-24 w-24 drop-shadow-md sm:h-28 sm:w-28" aria-hidden>
      <defs>
        <path id="lp-ring" d="M60 60 m -45 0 a 45 45 0 1 1 90 0 a 45 45 0 1 1 -90 0" />
      </defs>
      <circle cx="60" cy="60" r="60" fill="var(--clay)" />
      <circle cx="60" cy="60" r="33" fill="none" stroke="var(--cream)" strokeOpacity=".45" />
      <text className={ethiopic.className} x="60" y="69" textAnchor="middle" fontSize="22" fill="var(--cream)">
        ቡና
      </text>
      <text fontSize="10.5" letterSpacing="2.6" fill="var(--cream)">
        <textPath href="#lp-ring">CAFEFLOW · ADDIS ABABA · TABLE TO TILL ·</textPath>
      </text>
    </svg>
  );
}

function Receipt() {
  return (
    <div className="relative">
      <div className="absolute -left-5 -top-12 z-10 sm:-left-12 sm:-top-14">
        <Stamp />
      </div>
      <div className="rotate-[1.2deg] [filter:drop-shadow(0_24px_36px_rgba(30,26,20,0.22))]">
        <div className="border-x border-t border-[color:var(--line)] bg-[#fdfbf5] p-6 pb-4 font-mono text-[13px] leading-6 text-[color:var(--ink)] sm:p-7 sm:pb-5">
          <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.14em] text-[color:var(--soft)]">
            <span>CafeFlow · Table 06</span>
            <span className="tabular">12:47</span>
          </div>
          <div className="my-4 border-t border-dashed border-[color:var(--line)]" />
          {RECEIPT_LINES.map(([item, price]) => (
            <div key={item} className="flex justify-between">
              <span>{item}</span>
              <span className="tabular">{price} ETB</span>
            </div>
          ))}
          <div className="my-4 border-t border-dashed border-[color:var(--line)]" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="tabular">505 ETB</span>
          </div>
          <div className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--leaf)]">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[color:var(--leaf)]" aria-hidden />
            Sent to kitchen · preparing
          </div>
        </div>
        <svg viewBox="0 0 320 12" preserveAspectRatio="none" className="block h-3 w-full" aria-hidden>
          <path d={`M0 0 ${ZIGZAG} Z`} fill="#fdfbf5" />
        </svg>
      </div>
    </div>
  );
}

function Ticker() {
  const row = TICKER.map((item) => (
    <span key={item} className="flex items-center gap-6 sm:gap-10">
      <span>{item}</span>
      <span className="text-[color:var(--clay)]">✳</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-y border-[color:var(--line)] bg-[color:var(--flour2)] py-3.5">
      <div className="lp-marquee flex w-max gap-6 font-mono text-[13px] uppercase tracking-[0.16em] text-[color:var(--soft)] sm:gap-10">
        <div className="flex shrink-0 items-center gap-6 sm:gap-10">{row}</div>
        <div className="flex shrink-0 items-center gap-6 sm:gap-10" aria-hidden>
          {row}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main
      className="min-h-dvh overflow-x-clip bg-[color:var(--flour)] text-[color:var(--ink)]"
      style={
        {
          "--flour": "#f3eee4",
          "--flour2": "#ece5d5",
          "--cream": "#f6f1e6",
          "--ink": "#1e1a14",
          "--soft": "#615a4b",
          "--leaf": "#3a5a40",
          "--pine": "#2a4130",
          "--clay": "#b14e28",
          "--line": "#dcd2bf",
          "--night": "#212b1e",
        } as React.CSSProperties
      }
    >
      <style>{`
        @keyframes lp-marquee { to { transform: translateX(-50%); } }
        .lp-marquee { animation: lp-marquee 30s linear infinite; }
        @keyframes lp-spin { to { transform: rotate(360deg); } }
        .lp-spin { animation: lp-spin 22s linear infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .lp-marquee, .lp-spin { animation: none; }
        }
      `}</style>

      {/* Paper grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── Header ── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="CafeFlow home">
          <img src="/LOGO.jpg" alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-[color:var(--line)]" />
          <span className={`${fraunces.className} text-xl font-semibold tracking-tight`}>CafeFlow</span>
        </Link>
        <nav className="hidden items-center gap-7 font-mono text-[13px] lowercase text-[color:var(--soft)] md:flex" aria-label="Sections">
          <a href="#inside" className="transition-colors hover:text-[color:var(--ink)]">(inside)</a>
          <a href="#first-day" className="transition-colors hover:text-[color:var(--ink)]">(first day)</a>
          <a href="#price" className="transition-colors hover:text-[color:var(--ink)]">(the price)</a>
        </nav>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/login" className="text-[color:var(--soft)] underline decoration-[color:var(--line)] underline-offset-4 transition-colors hover:text-[color:var(--ink)]">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[color:var(--pine)] px-5 py-2.5 text-[color:var(--cream)] transition-colors hover:bg-[color:var(--leaf)]"
          >
            Start free
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:pb-28 lg:pt-16">
        <div>
          <p className="font-mono text-[13px] text-[color:var(--soft)]">
            <span className={ethiopic.className}>ከጠረጴዛ እስከ ሂሳብ</span> · table to till
          </p>
          <h1
            className={`${fraunces.className} mt-6 max-w-xl text-[3rem] font-medium leading-[1.02] tracking-[-0.02em] sm:text-[4.2rem]`}
          >
            Good coffee deserves{" "}
            <em className="relative inline-block font-medium not-italic">
              better books
              <Squiggle />
            </em>
            .
          </h1>
          <p className="mt-8 max-w-lg text-base leading-7 text-[color:var(--soft)] sm:text-lg sm:leading-8">
            CafeFlow runs the floor, the kitchen, the till and the stockroom. Guests order by QR in
            Amharic or English, tickets hit the kitchen board live, and every birr shows up in your
            morning report.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[color:var(--pine)] px-7 py-3.5 text-sm font-bold text-[color:var(--cream)] transition-colors hover:bg-[color:var(--leaf)]"
            >
              Try it free for 7 days
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold text-[color:var(--ink)] underline decoration-[color:var(--clay)] decoration-2 underline-offset-4 transition-colors hover:text-[color:var(--clay)]"
            >
              I work here, log me in
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm pt-8 lg:mx-0 lg:justify-self-end lg:pt-0">
          <Receipt />
          <p className="mt-6 text-center font-mono text-xs leading-5 text-[color:var(--soft)]">
            one ticket, seen by the guest,
            <br />
            the kitchen, and the till at once
          </p>
        </div>
      </section>

      <Ticker />

      {/* ── Inside ── */}
      <section id="inside" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="font-mono text-[13px] text-[color:var(--clay)]">(01) inside</p>
            <h2 className={`${fraunces.className} mt-4 text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl`}>
              From the first scan to the last <span className="italic text-[color:var(--leaf)]">birr</span>.
            </h2>
          </div>
          <p className="max-w-md self-end leading-7 text-[color:var(--soft)]">
            Most café software is built like a supermarket checkout. CafeFlow is built for the 7am
            macchiato rush: fast on the floor, calm in the kitchen, honest at the till.
          </p>
        </div>

        <div className="mt-14">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className="grid gap-2 border-t border-[color:var(--line)] py-7 last:border-b sm:grid-cols-[64px_260px_1fr] sm:gap-8 sm:py-8"
            >
              <span className="font-mono text-sm text-[color:var(--clay)]">{String(index + 1).padStart(2, "0")}</span>
              <h3 className={`${fraunces.className} text-2xl font-medium leading-tight`}>{feature.title}</h3>
              <p className="max-w-lg text-sm leading-6 text-[color:var(--soft)] sm:text-[15px] sm:leading-7">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── First day ── */}
      <section id="first-day" className="border-t border-[color:var(--line)] bg-[color:var(--flour2)]">
        <div className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[13px] text-[color:var(--clay)]">(02) your first day</p>
              <h2 className={`${fraunces.className} mt-4 text-4xl font-medium tracking-tight sm:text-5xl`}>
                Live before the evening rush.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[color:var(--soft)]">
              There is no onboarding project. Three steps from a phone or a laptop and the café is
              running on CafeFlow.
            </p>
          </div>
          <ol className="mt-14 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-t-[160px] border border-[color:var(--line)] bg-[color:var(--cream)] px-7 pb-9 pt-16 text-center"
              >
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-[color:var(--clay)] font-mono text-sm text-[color:var(--clay)]">
                  {index + 1}
                </span>
                <h3 className={`${fraunces.className} mt-6 text-2xl font-medium`}>{step.title}</h3>
                <p className="mx-auto mt-3 max-w-[26ch] text-sm leading-6 text-[color:var(--soft)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Price ── */}
      <section id="price" className="bg-[color:var(--night)] text-[color:var(--cream)]">
        <div className="mx-auto grid max-w-6xl scroll-mt-8 gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="relative">
            <p className="font-mono text-[13px] text-[#a9c39b]">(03) the price</p>
            <h2 className={`${fraunces.className} mt-6 text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl`}>
              <span className="tabular">30,000</span> birr.
              <br />
              Six months.
              <br />
              <span className="italic text-[#a9c39b]">The whole café.</span>
            </h2>
            <div className="mt-8 inline-block -rotate-3 rounded-md bg-[color:var(--clay)] px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--cream)]">
              7 days free · no card
            </div>
          </div>
          <div className="lg:justify-self-end">
            <p className="max-w-md leading-7 text-[color:var(--cream)]/70">
              No per-order fees, no per-seat pricing, no surprise tiers. One price for the whole café,
              however busy it gets.
            </p>
            <ul className="mt-8 space-y-4 text-sm leading-6">
              {PLAN_INCLUDES.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#a9c39b]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-[color:var(--cream)] px-7 py-3.5 text-sm font-bold text-[color:var(--night)] transition-colors hover:bg-white"
            >
              Start the trial
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[color:var(--line)] bg-[color:var(--flour)]">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:px-8">
          <p className={`${ethiopic.className} text-lg text-[color:var(--leaf)]`}>
            ቡና ይፍላ። <span className={`${fraunces.className} italic text-[color:var(--soft)]`}>let the coffee boil.</span>
          </p>
          <p className={`${fraunces.className} mt-4 text-6xl font-medium tracking-tight text-[color:var(--ink)] sm:text-8xl`}>
            CafeFlow
          </p>
          <div className="mt-10 flex flex-col justify-between gap-3 border-t border-[color:var(--line)] pt-6 font-mono text-[13px] text-[color:var(--soft)] sm:flex-row sm:items-center">
            <span>café operations, written down</span>
            <span className="flex items-center gap-6">
              <Link href="/login" className="transition-colors hover:text-[color:var(--ink)]">log in</Link>
              <Link href="/register" className="transition-colors hover:text-[color:var(--ink)]">start free</Link>
              <span>Addis Ababa · {new Date().getFullYear()}</span>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
