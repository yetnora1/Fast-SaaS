import Link from "next/link";
import { Fraunces } from "next/font/google";
import {
  ArrowRightIcon,
  ChartIcon,
  CheckCircleIcon,
  ChefHatIcon,
  CoinsIcon,
  PackageIcon,
  TableIcon,
  UsersIcon,
} from "@/components/icons";

// Landing-page-only display face. The rest of the app keeps its own fonts.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const FEATURES = [
  {
    icon: TableIcon,
    title: "QR self-ordering",
    body: "Guests scan the table code and order from a bilingual menu — English and Amharic — no app to install, no waving for a waiter.",
  },
  {
    icon: ChefHatIcon,
    title: "Kitchen & barista boards",
    body: "Tickets move new → preparing → ready on live boards, so the kitchen and the floor are reading the same queue.",
  },
  {
    icon: CoinsIcon,
    title: "Cashier & till",
    body: "Take payment, print the receipt, handle refunds, and close a shift that actually reconciles at the end of the night.",
  },
  {
    icon: PackageIcon,
    title: "Stock & purchasing",
    body: "Recipes draw down inventory as orders fire. Purchases, suppliers, and waste stay on the books — not in someone's head.",
  },
  {
    icon: UsersIcon,
    title: "Staff, shifts & payroll",
    body: "Eight focused roles from waiter to owner. Each person logs in to a workspace that shows their job and nothing else.",
  },
  {
    icon: ChartIcon,
    title: "The owner's ledger",
    body: "Daily sales, best sellers, and branch comparisons. Read the whole business in five minutes, not five spreadsheets.",
  },
];

const STEPS = [
  {
    title: "Register your café",
    body: "Create your account, add a branch, load the menu. It takes an afternoon, not a rollout plan.",
  },
  {
    title: "Print the table codes",
    body: "Every table gets its QR card. Every staff member gets a login scoped to their role.",
  },
  {
    title: "Open for service",
    body: "Orders, tickets, payments, and stock counts start writing themselves down as you work.",
  },
];

const FACTS = [
  ["08", "staff roles, waiter to owner"],
  ["02", "languages — English & Amharic"],
  ["∞", "branches under one account"],
  ["01", "plan. No tiers, no add-ons"],
];

const PLAN_INCLUDES = [
  "7-day free trial — no card, no commitment",
  "Unlimited orders, tables, and menu items",
  "All eight staff roles included",
  "Every branch under one account",
];

const RECEIPT_LINES: Array<[string, string]> = [
  ["1× Macchiato", "85"],
  ["2× Ful Special", "240"],
  ["1× Mango Juice", "120"],
  ["1× Sambusa", "60"],
];

function Receipt() {
  return (
    <div className="rotate-[0.6deg] border border-[color:var(--line)] bg-[#fffdf7] p-6 font-mono text-[13px] leading-6 text-[color:var(--ink)] shadow-[0_24px_48px_-24px_rgba(34,25,16,0.35)] sm:p-7">
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
      <div className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--accent)]">
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[color:var(--accent)]" aria-hidden />
        Sent to kitchen · preparing
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main
      className="min-h-dvh bg-[color:var(--paper)] text-[color:var(--ink)]"
      style={
        {
          "--paper": "#faf5ec",
          "--paper2": "#f2ead9",
          "--ink": "#221910",
          "--soft": "#5e5142",
          "--accent": "#8c3f14",
          "--accent-deep": "#73320e",
          "--line": "#e2d6c0",
          "--roast": "#1e140d",
          "--cream": "#f5eee2",
          "--gold": "#d9a354",
        } as React.CSSProperties
      }
    >
      {/* ── Header ── */}
      <header className="border-b border-[color:var(--line)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="CafeFlow home">
            <img src="/LOGO.jpg" alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-[color:var(--line)]" />
            <span className={`${fraunces.className} text-xl font-semibold tracking-tight`}>CafeFlow</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[color:var(--soft)] md:flex" aria-label="Sections">
            <a href="#features" className="transition-colors hover:text-[color:var(--ink)]">What it runs</a>
            <a href="#first-day" className="transition-colors hover:text-[color:var(--ink)]">First day</a>
            <a href="#pricing" className="transition-colors hover:text-[color:var(--ink)]">Pricing</a>
          </nav>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/login" className="rounded-md px-3 py-2 text-[color:var(--soft)] transition-colors hover:text-[color:var(--ink)]">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-[color:var(--ink)] px-4 py-2.5 text-[color:var(--cream)] transition-colors hover:bg-[color:var(--accent-deep)]"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">
            Café operations · Ethiopia
          </p>
          <h1
            className={`${fraunces.className} mt-6 max-w-2xl text-[2.7rem] font-semibold leading-[1.04] tracking-[-0.02em] sm:text-6xl`}
          >
            Take the order. Fire the ticket. Balance the till.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[color:var(--soft)] sm:text-lg sm:leading-8">
            CafeFlow runs the whole café on one system — QR menus in Amharic and English, live kitchen
            boards, cashier reconciliation, stock counts, and owner reports. One login per role, one
            source of truth.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-[color:var(--accent)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[color:var(--accent-deep)]"
            >
              Start your 7-day trial
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-md border border-[color:var(--line)] px-6 py-3 text-sm font-bold text-[color:var(--ink)] transition-colors hover:border-[color:var(--ink)]"
            >
              Staff & owner login
            </Link>
          </div>
          <p className="mt-4 text-sm text-[color:var(--soft)]">No card required. Cancel any time in the trial.</p>
        </div>
        <div className="mx-auto w-full max-w-sm lg:mx-0">
          <Receipt />
          <p className="mt-4 text-center text-xs text-[color:var(--soft)]">
            One ticket, seen by the guest, the kitchen, and the till at the same time.
          </p>
        </div>
      </section>

      {/* ── Fact strip ── */}
      <section className="border-y border-[color:var(--line)] bg-[color:var(--paper2)]">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-[color:var(--line)] px-5 sm:px-8 md:grid-cols-4 md:divide-x">
          {FACTS.map(([figure, label]) => (
            <div key={label} className="py-7 md:px-7 md:first:pl-0 md:last:pr-0">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className={`${fraunces.className} tabular text-3xl font-semibold`}>{figure}</span>
                <span className="mt-1 block text-sm leading-5 text-[color:var(--soft)]">{label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">What it runs</p>
          <h2 className={`${fraunces.className} mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl`}>
            Six jobs, one system.
          </h2>
          <p className="mt-5 leading-7 text-[color:var(--soft)]">
            Every part of service — from the moment a guest sits down to the moment the owner reads the
            day's numbers — is written down in the same place.
          </p>
        </div>
        <div className="mt-12 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="border-t border-[color:var(--line)] py-8">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-[color:var(--accent)]" />
                  <span className="font-mono text-xs text-[color:var(--soft)]">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className={`${fraunces.className} mt-5 text-xl font-semibold`}>{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[color:var(--soft)]">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── First day ── */}
      <section id="first-day" className="border-t border-[color:var(--line)]">
        <div className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20 sm:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">Your first day</p>
              <h2 className={`${fraunces.className} mt-4 text-4xl font-semibold tracking-tight sm:text-5xl`}>
                Live before the evening rush.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[color:var(--soft)]">
              There is no onboarding project. Three steps, done from a phone or a laptop, and the café is
              running on CafeFlow.
            </p>
          </div>
          <ol className="mt-12 grid gap-10 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-l-2 border-[color:var(--accent)] pl-6">
                <span className="font-mono text-sm text-[color:var(--accent)]">0{index + 1}</span>
                <h3 className={`${fraunces.className} mt-3 text-2xl font-semibold`}>{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[color:var(--soft)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-[color:var(--roast)] text-[color:var(--cream)]">
        <div className="mx-auto grid max-w-6xl scroll-mt-8 gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--gold)]">One plan, priced in birr</p>
            <h2 className={`${fraunces.className} mt-5 text-5xl font-semibold tracking-tight sm:text-6xl`}>
              <span className="tabular">30,000</span> ETB
              <span className="ml-3 text-xl font-medium text-[color:var(--cream)]/60">/ six months</span>
            </h2>
            <p className="mt-6 max-w-md leading-7 text-[color:var(--cream)]/70">
              No per-order fees, no per-seat pricing, no surprise tiers. One price for the whole café,
              however busy it gets.
            </p>
          </div>
          <div>
            <ul className="space-y-4 text-sm leading-6">
              {PLAN_INCLUDES.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--gold)]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-md bg-[color:var(--cream)] px-6 py-3 text-sm font-bold text-[color:var(--roast)] transition-colors hover:bg-white"
            >
              Start the trial
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[color:var(--line)] bg-[color:var(--paper)]">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-5 py-10 text-sm text-[color:var(--soft)] sm:flex-row sm:items-center sm:px-8">
          <p>
            <span className={`${fraunces.className} font-semibold text-[color:var(--ink)]`}>CafeFlow</span> — café
            operations, written down.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="transition-colors hover:text-[color:var(--ink)]">Log in</Link>
            <Link href="/register" className="transition-colors hover:text-[color:var(--ink)]">Start free</Link>
            <span>Addis Ababa · {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
