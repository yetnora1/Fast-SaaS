import Link from "next/link";
import Image from "next/image";
import { DM_Sans, Newsreader } from "next/font/google";
import { ArrowRightIcon } from "@/components/icons";

const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SERVICE_DAY = [
  ["06:30", "The menu is ready", "Open the day, check stock, brief the team."],
  ["12:47", "The ticket arrives", "A table order lands with the barista and kitchen at once."],
  ["21:15", "The till closes clean", "Payments, sales and the day’s work are already accounted for."],
];

const INCLUDED = [
  "A menu your guests can order from in Amharic or English",
  "Live kitchen and barista boards",
  "Cashier, receipt and shift-close tools",
  "Stock, purchasing, payroll and owner reporting",
];

export default function Home() {
  return (
    <main className={`${sans.className} min-h-dvh overflow-x-hidden bg-[#f7f1e7] text-[#213b36]`}>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .landing-photo { animation: settle 800ms cubic-bezier(.16,1,.3,1) both; }
          @keyframes settle { from { opacity: 0; transform: translateY(16px) rotate(1deg); } to { opacity: 1; transform: translateY(0) rotate(0); } }
        }
      `}</style>

      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CafeFlow home">
          <Image src="/LOGO.jpg" alt="" width={44} height={44} className="h-11 w-11 object-contain mix-blend-multiply" priority />
          <span className={`${serif.className} text-[1.45rem] font-semibold tracking-[-0.04em]`}>CafeFlow</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#58706a] md:flex" aria-label="Main navigation">
          <a className="transition-colors hover:text-[#213b36]" href="#how-it-works">How it works</a>
          <a className="transition-colors hover:text-[#213b36]" href="#what-is-included">What&apos;s included</a>
          <a className="transition-colors hover:text-[#213b36]" href="#pricing">Pricing</a>
        </nav>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/login" className="hidden text-[#46625b] transition-colors hover:text-[#213b36] sm:block">Sign in</Link>
          <Link href="/register" className="rounded-full bg-[#213b36] px-4 py-3 text-[#f7f1e7] transition hover:-translate-y-0.5 hover:bg-[#2c514a] sm:px-5">Start free</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[.88fr_1.12fr] lg:items-center lg:gap-14 lg:pb-28 lg:pt-14">
        <div className="relative z-10 lg:pb-8">
          <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#a55331]">
            <span className="h-px w-8 bg-current" /> Addis Ababa · Ethiopia
          </p>
          <h1 className={`${serif.className} max-w-[11ch] text-[3.65rem] font-medium leading-[.91] tracking-[-.055em] text-[#213b36] sm:text-[5.25rem]`}>
            Keep the cafe<br />moving. <em className="text-[#a55331]">Naturally.</em>
          </h1>
          <p className="mt-7 max-w-[35rem] text-base leading-7 text-[#52665f] sm:text-lg sm:leading-8">
            <span className="font-medium text-[#213b36]">ከጠረጴዛ እስከ ሂሳብ.</span> CafeFlow keeps orders, coffee, people and payments in rhythm—so your team can stay with the guests, not the paperwork.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#dd6b3d] px-6 py-3 text-sm font-bold text-white shadow-[0_9px_0_#b94f28] transition hover:translate-y-[2px] hover:shadow-[0_7px_0_#b94f28]">
              Start your cafe <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <span className="text-sm leading-5 text-[#60736c]">7 days free<br className="sm:hidden" /> · no card needed</span>
          </div>
        </div>

        <div className="landing-photo relative mx-auto w-full max-w-[680px] lg:mx-0">
          <div className="relative aspect-[1.1/1] overflow-hidden rounded-[2px] bg-[#d9c9ae] shadow-[18px_20px_0_#d8e3d7]">
            <Image src="/images/cafe_interior.jpg" alt="A lively independent cafe interior" fill priority sizes="(max-width: 1024px) 100vw, 52vw" className="object-cover object-center" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#172f2a]/80 via-[#172f2a]/20 to-transparent px-6 pb-6 pt-24 text-[#f7f1e7] sm:px-8 sm:pb-8">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#f4b24d]">A calm service is a good service</p>
              <p className={`${serif.className} mt-1 max-w-sm text-2xl leading-tight sm:text-3xl`}>Everything your cafe needs, without changing the way it feels.</p>
            </div>
          </div>
          <p className="mt-4 border-l-2 border-[#a55331] pl-4 text-sm leading-5 text-[#52665f]">For cafes where a full room, a busy counter and a good cup of coffee all matter.</p>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#d8cdb9] bg-[#e4ece2]">
        <div className="mx-auto grid max-w-[1240px] gap-px overflow-hidden px-5 sm:grid-cols-3 sm:px-8">
          {SERVICE_DAY.map(([number, title, body]) => <article key={number} className="relative border-[#cbd8cb] py-10 sm:border-r sm:px-8 sm:last:border-0 lg:px-12 lg:py-14">
            <span className="font-mono text-xs font-bold tracking-[.14em] text-[#a55331]">{number}</span>
            <h2 className={`${serif.className} mt-5 text-3xl leading-none tracking-[-.04em] text-[#213b36]`}>{title}</h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#52665f]">{body}</p>
          </article>)}
        </div>
      </section>

      <section id="what-is-included" className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-28">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#dc6b3d]">Everything in its place</p>
          <h2 className={`${serif.className} mt-4 max-w-md text-5xl leading-[.95] tracking-[-.05em] sm:text-6xl`}>Built around how a cafe actually runs.</h2>
        </div>
        <div className="border-t border-[#d8cdb9]">
          {INCLUDED.map((item, index) => <div key={item} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-[#d8cdb9] py-5 sm:grid-cols-[3.5rem_1fr_auto] sm:items-center sm:py-6">
            <span className="text-xs font-bold text-[#dd6b3d]">0{index + 1}</span>
            <p className={`${serif.className} text-xl leading-tight tracking-[-.02em] sm:text-2xl`}>{item}</p>
            <span className="hidden h-2 w-2 rounded-full bg-[#9db9a3] sm:block" aria-hidden />
          </div>)}
        </div>
      </section>

      <section id="pricing" className="bg-[#213b36] px-5 py-20 text-[#f7f1e7] sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1fr_.8fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#f4b24d]">Straightforward pricing</p>
            <h2 className={`${serif.className} mt-5 text-5xl leading-[.95] tracking-[-.05em] sm:text-7xl`}>30,000 birr<br /><em className="text-[#b7d2b9]">for six months.</em></h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#d4e0d3]/80">One price for the whole cafe. Every tool. Every staff role. No per-order fees waiting at the end of the month.</p>
          </div>
          <div className="rounded-sm bg-[#f7f1e7] p-7 text-[#213b36] shadow-[10px_10px_0_#dd6b3d] sm:p-9">
            <p className={`${serif.className} text-3xl leading-none`}>Start with a week on us.</p>
            <p className="mt-3 text-sm leading-6 text-[#52665f]">Set up a branch, add your menu and see the flow with your own team.</p>
            <Link href="/register" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#dd6b3d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c95c31]">Start your free week <ArrowRightIcon className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-9 text-sm text-[#60736c] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Link href="/" className={`${serif.className} text-2xl font-semibold tracking-[-.04em] text-[#213b36]`}>CafeFlow</Link>
        <p>Made for independent cafes in Ethiopia.</p>
        <div className="flex gap-5 font-semibold"><Link href="/login" className="hover:text-[#213b36]">Sign in</Link><Link href="/register" className="hover:text-[#213b36]">Start free</Link></div>
      </footer>
    </main>
  );
}
