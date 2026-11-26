import { Link } from "react-router-dom";
import {
  ArrowRight,
  Barcode,
  Boxes,
  Building2,
  CalendarClock,
  Check,
  CloudOff,
  Cross,
  FileCheck2,
  Layers,
  Receipt as ReceiptText,
  ShieldCheck,
  Timer,
  Truck,
} from "lucide-react";
import { BRANCHES } from "@/data/branches";
import { useAuth } from "@/context/AuthContext";

const CAPABILITIES = [
  {
    icon: ReceiptText,
    title: "Counter that keeps up",
    body: "Barcode-first checkout, cash, card, e-wallet and installment capture, statutory discounts, loyalty points, and an 80 mm BIR-ready receipt that prints without the browser fighting it.",
  },
  {
    icon: Layers,
    title: "Batches, not just quantities",
    body: "Every unit carries a batch number and expiry. Sales draw first-expiry-first-out, so short-dated stock leaves the shelf before it becomes a write-off.",
  },
  {
    icon: Truck,
    title: "Receiving with evidence",
    body: "Draft a purchase order, get branch approval, then post a goods receipt against the supplier invoice — batch, expiry and quantity checked line by line.",
  },
  {
    icon: CalendarClock,
    title: "Expiry before it bites",
    body: "A 90-day watch list, expired-batch separation, reorder points per branch, and stock counts that record variances against the exact batch.",
  },
  {
    icon: CloudOff,
    title: "Offline is a mode, not an error",
    body: "When the line drops, receipts queue on the device. Reconnect and sync once, with duplicate protection and a visible pending count.",
  },
  {
    icon: ShieldCheck,
    title: "Accountability built in",
    body: "Role-based access, void and refund controls, and an audit trail that names the actor, the branch, the reason, and the batch restored.",
  },
];

const DAY = [
  { time: "07:40", title: "Delivery at the back door", body: "MediCore arrives with PO-2026-0041. The receiving officer checks the invoice, records two batches, and rejects nothing — the temperature log is in range." },
  { time: "09:02", title: "First rush at the counter", body: "A senior citizen buys Losartan. The 20% statutory discount removes VAT automatically; the receipt prints the batch that left the shelf." },
  { time: "11:30", title: "Expiry watch turns amber", body: "Bioflu crosses the 90-day window. It moves to the front of the FEFO queue instead of disappearing into a stockroom." },
  { time: "16:10", title: "A return with a paper trail", body: "A receipt is refunded after an adverse reaction. Stock returns to its original batch and the reason lands in the audit log under the approver's name." },
];

export default function LandingPage() {
  const { user } = useAuth();
  const entry = user ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen bg-[#f4f9fa] text-[#102a43]">
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="WellSpring One home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087f8c] text-white"><Cross aria-hidden="true" className="h-5 w-5" /></span>
          <span>
            <span className="block font-display text-lg font-bold leading-tight tracking-[-0.02em]">WellSpring One</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#486581]">Pharmacy operations · Davao</span>
          </span>
        </Link>
        <nav aria-label="Landing navigation" className="hidden items-center gap-6 text-sm text-[#486581] md:flex">
          <a href="#capabilities" className="hover:text-[#102a43]">Capabilities</a>
          <a href="#counter" className="hover:text-[#102a43]">A day at the counter</a>
          <a href="#branches" className="hover:text-[#102a43]">Branches</a>
        </nav>
        <Link to={entry} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102a43] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#173f63]">
          {user ? "Open dashboard" : "Open prototype"}<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:pb-24 lg:pt-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#b8ddd6] bg-[#eafaf6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#087f8c]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#087f8c]" aria-hidden="true" />Built for eight branches
            </p>
            <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.04] tracking-[-0.04em] sm:text-[3.4rem] lg:text-[3.7rem]">
              Every counter,<br />every batch,<br /><span className="text-[#087f8c]">one ledger.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#39566d] sm:text-lg">
              WellSpring One runs the pharmacy counter, the stockroom, and the supplier desk on the same record.
              Scan a barcode, sell the earliest-expiring batch, receive against the invoice, and close the day with numbers that agree.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={entry} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f8c] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(8_127_140/0.22)] transition-colors hover:bg-[#066b76]">
                {user ? "Return to your shift" : "Enter the working prototype"}<ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a href="#capabilities" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#c3d8e2] bg-white px-5 text-sm font-semibold text-[#102a43] transition-colors hover:border-[#087f8c]">
                See what is inside
              </a>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-[#cbdce5] pt-6">
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#486581]">Branches</dt><dd className="mt-1 font-display text-2xl font-bold">{BRANCHES.length}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#486581]">Sell order</dt><dd className="mt-1 font-display text-2xl font-bold">FEFO</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#486581]">Receipt</dt><dd className="mt-1 font-display text-2xl font-bold">80 mm</dd></div>
            </dl>
            <p className="mt-5 text-xs text-[#486581]">Demo account: <span className="font-mono text-[#102a43]">admin@wellspring.ph</span> · <span className="font-mono text-[#102a43]">password123</span></p>
          </div>

          <div className="relative">
            <div aria-hidden="true" className="absolute -right-6 top-8 hidden h-64 w-64 rounded-full border-[26px] border-[#d9f2ec] lg:block" />
            <div className="relative rounded-[1.6rem] border border-[#cbdce5] bg-white p-5 shadow-[0_28px_60px_rgb(16_42_67/0.12)]">
              <div className="flex items-center justify-between border-b border-dashed border-[#cbdce5] pb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#486581]">WS01 · Davao Main</p>
                  <p className="mt-1 font-display text-lg font-bold">Register 01 · current sale</p>
                </div>
                <span className="rounded-full bg-[#eafaf6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#087f8c]">Online</span>
              </div>
              <ul className="divide-y divide-dashed divide-[#e1ebf0] py-2 text-sm">
                <li className="flex items-start justify-between gap-3 py-3">
                  <div><p className="font-semibold">Losartan 50 mg tablet</p><p className="mt-0.5 text-[11px] text-[#486581]">LOSA-50 · batch LOS-26-201 · exp 06/2027</p></div>
                  <p className="font-semibold">₱145.00</p>
                </li>
                <li className="flex items-start justify-between gap-3 py-3">
                  <div><p className="font-semibold">Bioflu tablet</p><p className="mt-0.5 text-[11px] text-[#855b13]">BIOFLU · batch BFL-26-118 · 24 days left · FEFO</p></div>
                  <p className="font-semibold">₱41.25</p>
                </li>
              </ul>
              <div className="rounded-xl bg-[#f2f7fa] p-4">
                <div className="flex justify-between text-xs text-[#486581]"><span>Subtotal</span><span>₱186.25</span></div>
                <div className="mt-1 flex justify-between text-xs text-[#486581]"><span>Senior discount · VAT removed</span><span>−₱37.25</span></div>
                <div className="mt-3 flex items-end justify-between border-t border-[#cbdce5] pt-3"><span className="text-sm font-semibold">Total due</span><span className="font-display text-2xl font-bold">₱149.00</span></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f2f7fa] px-2.5 py-2 text-[#39566d]"><Barcode aria-hidden="true" className="h-3.5 w-3.5" />Scanner-ready</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f2f7fa] px-2.5 py-2 text-[#39566d]"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />Rx confirmed</span>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-3 hidden rounded-xl border border-[#cbdce5] bg-white px-4 py-3 text-xs shadow-lg sm:block">
              <p className="flex items-center gap-2 font-semibold"><Boxes aria-hidden="true" className="h-4 w-4 text-[#087f8c]" />14 batches in this cart&apos;s path</p>
              <p className="mt-1 text-[#486581]">Expiry checked before price is taken.</p>
            </div>
          </div>
        </section>

        <section id="capabilities" className="border-y border-[#cbdce5] bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="eyebrow">What the system actually does</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Six things the counter cannot fake.</h2>
              <p className="mt-4 text-sm leading-7 text-[#39566d]">This is a working prototype, not a slideware mock. Each capability below is wired into the same local data store used during the demo.</p>
            </div>
            <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map(({ icon: Icon, title, body }) => (
                <article key={title}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eafaf6] text-[#087f8c]"><Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} /></span>
                  <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#39566d]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="counter" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="eyebrow">One ordinary Tuesday</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">The day, in four checkpoints.</h2>
              <p className="mt-4 text-sm leading-7 text-[#39566d]">WellSpring runs on routines: receiving before opening, a morning rush, an expiry review, and the occasional difficult return. The prototype follows those routines instead of inventing a dashboard nobody uses.</p>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#b8ddd6] bg-[#eafaf6] px-4 py-3 text-xs leading-5 text-[#087f8c]">
                <Timer aria-hidden="true" className="h-4 w-4 shrink-0" />
                <p>Each step writes to stock, reports, and the audit trail together — no second spreadsheet.</p>
              </div>
            </div>
            <ol className="relative space-y-6 border-l-2 border-[#cbdce5] pl-6">
              {DAY.map((step) => (
                <li key={step.time} className="relative">
                  <span aria-hidden="true" className="absolute -left-[1.95rem] top-1.5 h-3 w-3 rounded-full border-2 border-[#087f8c] bg-[#f4f9fa]" />
                  <p className="font-mono text-xs font-semibold text-[#087f8c]">{step.time}</p>
                  <h3 className="mt-1 font-display text-lg font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#39566d]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="branches" className="border-y border-[#cbdce5] bg-[#eef6f8] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">The network</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Eight branches, one standard.</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#39566d]">Head office can switch branches without signing out. Each branch keeps its own batches, orders, and receipts; consolidation is a view, not a copy.</p>
              </div>
              <Link to={entry} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#087f8c] hover:underline">Open the branch switcher<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {BRANCHES.map((branch) => (
                <li key={branch.id} className="rounded-xl border border-[#d3e3ea] bg-white px-4 py-3">
                  <p className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#486581]">
                    <span>{branch.code}</span>{branch.type === "FLAGSHIP" && <span className="rounded bg-[#e3f0fa] px-1.5 py-0.5 text-[10px] text-[#2563a8]">Flagship</span>}
                  </p>
                  <p className="mt-1 font-display text-base font-bold">{branch.name}</p>
                  <p className="text-xs text-[#486581]">{branch.city}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-8 rounded-2xl border border-[#cbdce5] bg-white p-6 sm:p-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-center">
            <div>
              <p className="eyebrow">Before you click in</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.03em] sm:text-3xl">A prototype with its boundaries stated.</h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-[#39566d]">
                <li className="flex gap-3"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#087f8c]" />Operational data lives in this browser&apos;s local storage so the demo works without a server.</li>
                <li className="flex gap-3"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#087f8c]" />The Express and Prisma API in the same repository models the production boundary; it is not yet the runtime source for this UI.</li>
                <li className="flex gap-3"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#087f8c]" />Payments are recorded, not processed. Card, e-wallet, and installment entries capture references for reconciliation.</li>
                <li className="flex gap-3"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#087f8c]" />Browser sign-up is a demo convenience, not production identity. Staff accounts are seeded for role testing.</li>
              </ul>
            </div>
            <div className="rounded-xl bg-[#102a43] p-6 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ee6cf]">Try the flow</p>
              <h3 className="mt-2 font-display text-xl font-bold">Cashier → pharmacy → manager</h3>
              <p className="mt-2 text-sm leading-6 text-[#c8dce8]">Sign in as the cashier to sell, the pharmacist to check a prescription line, or the branch manager to approve, receive, and refund.</p>
              <Link to={entry} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#102a43] transition-colors hover:bg-[#eafaf6]">
                Enter the prototype<ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-[11px] text-[#9fb8c9]">admin@wellspring.ph · password123</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#cbdce5] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-xs text-[#486581] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="flex items-center gap-2"><Building2 aria-hidden="true" className="h-4 w-4" />WellSpring Pharmacy &amp; Retail Corp. · Davao City</p>
          <p className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><FileCheck2 aria-hidden="true" className="h-3.5 w-3.5" />POS / Inventory / Supplier</span>
            <Link to="/login" className="font-semibold text-[#087f8c] hover:underline">Staff sign in</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
