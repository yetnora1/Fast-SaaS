import Link from "next/link";
import {
  ArrowRightIcon,
  ChartIcon,
  CheckCircleIcon,
  ChefHatIcon,
  ClockIcon,
  CoinsIcon,
  PackageIcon,
  StoreIcon,
  TableIcon,
} from "@/components/icons";

const FEATURES = [
  { title: "QR self-ordering", body: "A bilingual menu and order flow that feels effortless for every guest.", icon: TableIcon },
  { title: "Kitchen & barista", body: "Live prep boards keep handoffs calm, visible, and on time.", icon: ChefHatIcon },
  { title: "Cashier & shifts", body: "Payments, receipts, refunds, and reconciliation in one accountable flow.", icon: CoinsIcon },
  { title: "Inventory & store", body: "Track stock, purchases, suppliers, and waste across every branch.", icon: PackageIcon },
  { title: "Owner insight", body: "See sales, best sellers, and team performance without chasing spreadsheets.", icon: ChartIcon },
  { title: "Built for teams", body: "Purposeful workspaces for each role, from the floor to head office.", icon: StoreIcon },
];

const STEPS = [
  { number: "01", title: "Set up your café", body: "Add your branch and menu. Your operating space is ready in minutes." },
  { number: "02", title: "Open the floor", body: "Print table QR codes and give every team member a clear workspace." },
  { number: "03", title: "See the whole picture", body: "Follow orders, stock, shifts, and sales as your service unfolds." },
];

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#f7f6f2] text-[#172b2e]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="CafeFlow home">
          <img src="/LOGO.jpg" alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-[#1f3a3d]/15" />
          <span className="font-display text-xl font-bold tracking-tight">Cafe<span className="text-[#0d7d6c]">Flow</span></span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <Link href="/login" className="rounded-lg px-3 py-2 text-[#526568] transition-colors hover:text-[#172b2e]">Log in</Link>
          <Link href="/register" className="rounded-lg bg-[#1f3a3d] px-4 py-2.5 text-white transition-colors hover:bg-[#294b4f]">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:pt-20">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 border-b border-[#0d7d6c]/30 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0d7d6c]">Made for Ethiopian cafés</p>
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-[-0.035em] text-[#172b2e] sm:text-6xl lg:text-7xl">
            Calm service. <span className="text-[#0d7d6c]">Clear control.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#526568] sm:text-lg">
            CafeFlow brings ordering, kitchen operations, payments, stock, and reporting into one thoughtful workspace for your whole café.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0d7d6c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0a6558]">
              Start your 7-day trial <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-lg border border-[#b9c8c7] bg-transparent px-5 py-3 text-sm font-bold text-[#294b4f] transition-colors hover:border-[#1f3a3d] hover:bg-white">
              Staff and owner login
            </Link>
          </div>
          <p className="mt-4 text-xs font-medium text-[#708083]">No card required. English and Amharic from day one.</p>
        </div>

        <aside className="border border-[#294b4f] bg-[#1f3a3d] p-5 text-white sm:p-7">
          <div className="flex items-center justify-between border-b border-white/15 pb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8fc9c1]">The service desk</p>
              <h2 className="mt-1 font-display text-2xl font-bold">Everything in its place</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-[#8fc9c1]"><ClockIcon /></span>
          </div>
          <div className="divide-y divide-white/10">
            {[
              ["Guest orders", "From table to kitchen, instantly"],
              ["Service rhythm", "Live updates for every role"],
              ["Business pulse", "Sales and stock without the noise"],
            ].map(([title, detail], index) => (
              <div key={title} className="flex gap-4 py-5">
                <span className="font-mono text-xs text-[#8fc9c1]">0{index + 1}</span>
                <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-white/65">{detail}</p></div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="border-y border-[#d8dfda] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10 lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0d7d6c]">Designed for the floor</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">A system that supports the work.</h2>
            <p className="mt-5 max-w-sm leading-7 text-[#526568]">Every view has one job. The result is less friction during busy service and better decisions after it.</p>
          </div>
          <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return <article key={feature.title} className="border-t border-[#d8dfda] py-6 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                <Icon className="h-5 w-5 text-[#0d7d6c]" />
                <h3 className="mt-4 font-display text-xl font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#526568]">{feature.body}</p>
              </article>;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="flex flex-col justify-between gap-5 border-b border-[#d8dfda] pb-7 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0d7d6c]">A better first day</p><h2 className="mt-3 font-display text-4xl font-bold tracking-tight">Live in an afternoon.</h2></div>
          <p className="max-w-sm text-sm leading-6 text-[#526568]">No lengthy rollout. Just a practical sequence that gets your team operating together.</p>
        </div>
        <div className="grid sm:grid-cols-3">
          {STEPS.map((step) => <article key={step.number} className="border-b border-[#d8dfda] py-8 sm:border-b-0 sm:border-r sm:px-8 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
            <span className="font-mono text-sm text-[#0d7d6c]">{step.number}</span>
            <h3 className="mt-5 font-display text-2xl font-bold">{step.title}</h3>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[#526568]">{step.body}</p>
          </article>)}
        </div>
      </section>

      <section className="bg-[#e6eeea] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0d7d6c]">One clear plan</p><h2 className="mt-3 font-display text-4xl font-bold tracking-tight">30,000 ETB <span className="text-xl font-normal text-[#526568]">/ 6 months</span></h2></div>
          <div className="max-w-md"><ul className="space-y-2 text-sm leading-6 text-[#385054]">{["Unlimited orders, tables, and menu items", "All eight staff roles", "Multiple branches under one account"].map(item => <li key={item} className="flex gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#0d7d6c]" />{item}</li>)}</ul><Link href="/register" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#1f3a3d] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#294b4f]">Start free <ArrowRightIcon className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <footer className="bg-[#172b2e] px-5 py-8 text-sm text-white/60 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><p><span className="font-display font-bold text-white">CafeFlow</span> — café operations, made clear.</p><p>Built for Ethiopia.</p></div></footer>
    </main>
  );
}
