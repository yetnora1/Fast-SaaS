import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 className="font-display text-5xl font-bold tracking-tight">
          Cafe<span className="text-brand-accent">Flow</span> <span className="text-brand-muted">SaaS</span>
        </h1>
        <p className="mt-3 text-brand-muted">Multi-Role • Multi-Branch • Offline-Ready — for Ethiopian Café Operations</p>
        <p className="mt-1 text-xs text-brand-muted/70">MySQL edition · 8 roles · 30,000 ETB / 6mo · 7-day trial</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/login" className="rounded-xl bg-brand-accent px-6 py-3 font-medium text-brand-accentFg shadow-card transition-colors hover:bg-brand-accentHover">
          Staff / Owner Login
        </Link>
        <Link href="/register" className="rounded-xl bg-brand-surface2 px-6 py-3 font-medium transition-colors hover:bg-white/10">
          Register your Café
        </Link>
        <Link href="/saas-admin/login" className="rounded-xl border border-brand-border px-6 py-3 font-medium transition-colors hover:bg-white/5">
          SaaS Admin
        </Link>
      </div>
      <div className="max-w-md text-xs text-brand-muted">
        Demo accounts (password <code className="rounded bg-brand-surface2 px-1 py-0.5 text-brand-foreground">Password123!</code>): owner@zadcafe.et, manager@zadcafe.et, waiter@zadcafe.et,
        cashier@zadcafe.et, barista@zadcafe.et, kitchen@zadcafe.et, store@zadcafe.et · SaaS: fast.saas.cafe@gmail.com (password: <code className="rounded bg-brand-surface2 px-1 py-0.5 text-brand-foreground">Yetnora@1</code>)
      </div>
    </main>
  );
}
