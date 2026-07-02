import Link from "next/link";

const FEATURES = [
  {
    icon: "📱",
    title: "QR Self-Ordering",
    body: "Customers scan a table QR, browse a bilingual English/Amharic menu with photos, and order from their phone — no app install.",
  },
  {
    icon: "🍳",
    title: "Kitchen & Barista Displays",
    body: "Live order boards for kitchen and bar with prep timers, allergy alerts, and one-tap status updates.",
  },
  {
    icon: "💵",
    title: "Cashier & Shifts",
    body: "POS payments (Cash, Telebirr, CBE Birr), receipts, refunds, and shift reconciliation with an auditable trail.",
  },
  {
    icon: "📦",
    title: "Inventory & Store",
    body: "Stock counts, purchase orders, supplier management, and waste logging across every branch.",
  },
  {
    icon: "📊",
    title: "Owner Reports",
    body: "Daily sales, best sellers, staff performance, and VAT-ready summaries — one dashboard for all branches.",
  },
  {
    icon: "🏢",
    title: "Multi-Branch, 8 Roles",
    body: "Owner, manager, waiter, cashier, kitchen, barista, store keeper, and admin — each sees exactly their job.",
  },
];

const STEPS = [
  { n: "1", title: "Register your café", body: "Sign up in two minutes. A starter menu is created for you — your QR page works on day one." },
  { n: "2", title: "Print table QR codes", body: "Generate and print per-table QR tickets straight from the floor plan." },
  { n: "3", title: "Serve & track", body: "Orders flow from customer phones to the kitchen displays to the cashier — all in real time." },
];

export default function Home() {
  return (
    <main className="min-h-dvh">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-bold tracking-tight">
          Cafe<span className="text-brand-accent">Flow</span>
        </span>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="rounded-lg px-3 py-2 text-brand-muted transition-colors hover:text-brand-foreground">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-accent px-4 py-2 font-medium text-brand-accentFg transition-colors hover:bg-brand-accentHover"
          >
            Start free trial
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 text-center">
        <p className="mb-4 inline-block rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-xs text-brand-muted">
          Built for Ethiopian cafés · English + አማርኛ
        </p>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Run your whole café from <span className="text-brand-accent">one system</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-brand-muted sm:text-lg">
          QR self-ordering, kitchen displays, cashier, inventory, and owner reports — multi-branch, multi-role, in English and Amharic.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="rounded-xl bg-brand-accent px-6 py-3 font-medium text-brand-accentFg shadow-card transition-colors hover:bg-brand-accentHover"
          >
            Register your café — 7 days free
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-brand-border bg-brand-surface2 px-6 py-3 font-medium transition-colors hover:bg-white/10"
          >
            Staff / Owner login
          </Link>
        </div>
        <p className="mt-3 text-xs text-brand-muted/70">No credit card required · Cancel anytime during the trial</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">Everything a café floor needs</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-brand-border/70 bg-brand-surface p-5 shadow-card">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">Live in an afternoon</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-brand-border/70 bg-brand-surface p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent font-display font-bold text-brand-accentFg">
                {s.n}
              </span>
              <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-brand-accent/40 bg-brand-surface p-8 text-center shadow-pop">
          <h2 className="font-display text-2xl font-bold">Simple pricing</h2>
          <div className="mt-4">
            <span className="font-display text-5xl font-bold">30,000</span>
            <span className="ml-1 text-brand-muted">ETB / 6 months</span>
          </div>
          <ul className="mt-6 space-y-2 text-left text-sm text-brand-muted">
            <li>✓ Unlimited orders, tables, and menu items</li>
            <li>✓ All 8 staff roles included</li>
            <li>✓ Multiple branches under one account</li>
            <li>✓ Pay by bank transfer — upload the receipt, get activated</li>
          </ul>
          <Link
            href="/register"
            className="mt-7 block rounded-xl bg-brand-accent px-6 py-3 font-medium text-brand-accentFg transition-colors hover:bg-brand-accentHover"
          >
            Start your 7-day free trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border/60 py-8 text-center text-xs text-brand-muted">
        <p>
          Cafe<span className="text-brand-accent">Flow</span> — café management for Ethiopia · ለኢትዮጵያ ካፌዎች የተሰራ
        </p>
      </footer>
    </main>
  );
}
