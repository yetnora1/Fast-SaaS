"use client";
import { useState, useMemo } from "react";
import { api, usePoll } from "@/components/fetcher";
import {
  Card,
  KPICard,
  Button,
  Input,
  Select,
  Field,
  Modal,
  PageHeader,
  StatusChip,
  EmptyState,
  Spinner,
} from "@/components/ui";
import { PackageIcon, PlusIcon, CoinsIcon, CheckCircleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

/* ── Types ─────────────────────────────────────────────────────── */
interface Supplier {
  id: string;
  name: string;
}
interface InvItem {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}
interface POItem {
  id: string;
  inventoryItemId: string;
  quantity: string;
  unitCost: string;
}
interface PO {
  id: string;
  status: string;
  total: string;
  paidAmount: string;
  creditAmount: string;
  isCredit: boolean;
  notes: string | null;
  createdAt: string;
  supplier: { name: string } | null;
  items: POItem[];
}

type Tab = "orders" | "new" | "credits" | "report";

/* ── Helpers ───────────────────────────────────────────────────── */
function fmtETB(n: number) {
  return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ETB";
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Main Component ────────────────────────────────────────────── */
export default function PurchaserPage() {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<Tab>("orders");
  const { data, reload } = usePoll<{ purchaseOrders: PO[] }>("/api/store/purchase-orders", 6000);
  const { data: suppData, reload: reloadSuppliers } = usePoll<{ suppliers: Supplier[] }>("/api/store/suppliers", 30000);
  const { data: invData } = usePoll<{ items: InvItem[] }>("/api/store/inventory", 30000);

  const pos = useMemo(() => data?.purchaseOrders ?? [], [data?.purchaseOrders]);
  const suppliers = suppData?.suppliers ?? [];
  const invItems = invData?.items ?? [];

  /* KPI aggregations */
  const totalSpent = useMemo(() => pos.reduce((s, p) => s + Number(p.total), 0), [pos]);
  const totalPaid = useMemo(() => pos.reduce((s, p) => s + Number(p.paidAmount), 0), [pos]);
  const totalCredit = useMemo(() => pos.reduce((s, p) => s + Number(p.creditAmount), 0), [pos]);
  const creditOrders = useMemo(() => pos.filter((p) => p.isCredit && Number(p.creditAmount) > 0), [pos]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "orders", label: lang === "am" ? "ሁሉም ትዕዛዞች" : "All Orders" },
    { key: "new", label: lang === "am" ? "አዲስ ግዢ" : "New Purchase" },
    { key: "credits", label: lang === "am" ? "ብድሮች" : "Credits" },
    { key: "report", label: lang === "am" ? "ሪፖርት" : "Report" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={lang === "am" ? "ግዢ" : "Purchases"}
        subtitle={lang === "am" ? "የግዢ ትዕዛዞች ፣ ብድሮች ፣ ሪፖርት" : "Purchase orders, credits & reports"}
      />

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label={lang === "am" ? "ጠቅላላ ወጪ" : "Total Spent"}
          value={fmtETB(totalSpent)}
          icon={<CoinsIcon className="h-5 w-5" />}
          tone="accent"
        />
        <KPICard
          label={lang === "am" ? "የተከፈለ" : "Total Paid"}
          value={fmtETB(totalPaid)}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          tone="green"
        />
        <KPICard
          label={lang === "am" ? "ያልተከፈለ ብድር" : "Outstanding Credit"}
          value={fmtETB(totalCredit)}
          icon={<CoinsIcon className="h-5 w-5" />}
          tone={totalCredit > 0 ? "red" : "green"}
        />
        <KPICard
          label={lang === "am" ? "ትዕዛዞች" : "Total Orders"}
          value={String(pos.length)}
          icon={<PackageIcon className="h-5 w-5" />}
          tone="blue"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-brand-border bg-brand-surface2 p-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              tab === tb.key
                ? "bg-brand-accent text-brand-accentFg shadow-sm"
                : "text-brand-muted hover:text-brand-foreground hover:bg-white/5"
            }`}
          >
            {tb.label}
            {tb.key === "credits" && totalCredit > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-status-redSolid text-[10px] font-bold text-white px-1">
                {creditOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "orders" && <OrdersList pos={pos} reload={reload} lang={lang} />}
      {tab === "new" && <NewPurchaseForm suppliers={suppliers} invItems={invItems} reload={reload} reloadSuppliers={reloadSuppliers} lang={lang} onDone={() => setTab("orders")} />}
      {tab === "credits" && <CreditsList credits={creditOrders} reload={reload} lang={lang} />}
      {tab === "report" && <PurchaseReport pos={pos} lang={lang} />}
    </div>
  );
}

/* ── Orders List ───────────────────────────────────────────────── */
function OrdersList({ pos, reload, lang }: { pos: PO[]; reload: () => void; lang: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: string) {
    setBusy(id);
    try {
      await api(`/api/store/purchase-orders/${id}/${action}`, { method: "PATCH" });
      reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (pos.length === 0) {
    return <EmptyState icon={<PackageIcon className="h-7 w-7" />}>{lang === "am" ? "ምንም ግዢ የለም" : "No purchase orders yet"}</EmptyState>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {pos.map((po) => {
        const total = Number(po.total);
        const paid = Number(po.paidAmount);
        const credit = Number(po.creditAmount);
        return (
          <Card key={po.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-brand-foreground">{po.supplier?.name ?? "—"}</p>
                <p className="text-xs text-brand-muted">{fmtDate(po.createdAt)}</p>
              </div>
              <StatusChip status={po.status} />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-muted">{lang === "am" ? "ጠቅላላ" : "Total"}</span>
                <span className="tabular font-semibold">{fmtETB(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">{lang === "am" ? "የተከፈለ" : "Paid"}</span>
                <span className="tabular font-semibold text-status-greenText">{fmtETB(paid)}</span>
              </div>
              {po.isCredit && (
                <div className="flex justify-between">
                  <span className="text-brand-muted">{lang === "am" ? "ብድር" : "Credit"}</span>
                  <span className={`tabular font-semibold ${credit > 0 ? "text-status-redText" : "text-status-greenText"}`}>
                    {fmtETB(credit)}
                  </span>
                </div>
              )}
            </div>
            {po.items.length > 0 && (
              <p className="text-xs text-brand-muted">
                {po.items.length} {lang === "am" ? "ዕቃዎች" : "items"}
              </p>
            )}
            {po.notes && <p className="text-xs text-brand-muted italic">&quot;{po.notes}&quot;</p>}
            <div className="flex gap-2 pt-1">
              {po.status === "PENDING_APPROVAL" && (
                <Button size="sm" onClick={() => act(po.id, "approve")} loading={busy === po.id}>
                  {lang === "am" ? "ፍቃድ ስጥ" : "Approve"}
                </Button>
              )}
              {["APPROVED", "SENT"].includes(po.status) && (
                <Button size="sm" variant="ghost" onClick={() => act(po.id, "receive")} loading={busy === po.id}>
                  {lang === "am" ? "ተቀብል" : "Mark Received"}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ── New Purchase Form ─────────────────────────────────────────── */
interface LineItem {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
}

function NewPurchaseForm({
  suppliers,
  invItems,
  reload,
  reloadSuppliers,
  lang,
  onDone,
}: {
  suppliers: Supplier[];
  invItems: InvItem[];
  reload: () => void;
  reloadSuppliers: () => Promise<void> | void;
  lang: string;
  onDone: () => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [isCredit, setIsCredit] = useState(false);
  const [creditPercent, setCreditPercent] = useState(50);
  const [lines, setLines] = useState<LineItem[]>([{ inventoryItemId: "", quantity: 0, unitCost: 0 }]);
  const [busy, setBusy] = useState(false);

  // Inline "add new supplier" — lets you register a supplier without leaving the form.
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", contact: "" });
  const [savingSupplier, setSavingSupplier] = useState(false);

  async function createSupplier(e: React.FormEvent) {
    e.preventDefault();
    const name = newSupplier.name.trim();
    if (!name) return;
    setSavingSupplier(true);
    try {
      const created = await api<{ id: string; name: string }>("/api/store/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone: newSupplier.phone.trim() || undefined,
          contact: newSupplier.contact.trim() || undefined,
        }),
      });
      await reloadSuppliers();
      setSupplierId(created.id); // auto-select the supplier just created
      setShowAddSupplier(false);
      setNewSupplier({ name: "", phone: "", contact: "" });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSupplier(false);
    }
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const paidAmount = isCredit ? Math.round((total * (100 - creditPercent)) * 100) / 100 / 100 : total;
  const creditAmount = isCredit ? Math.round(total * creditPercent) / 100 : 0;

  function setLine(idx: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { inventoryItemId: "", quantity: 0, unitCost: 0 }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validLines = lines.filter((l) => l.inventoryItemId && l.quantity > 0);
    if (validLines.length === 0) return alert(lang === "am" ? "ቢያንስ 1 ዕቃ ያስፈልጋል" : "At least 1 item required");
    setBusy(true);
    try {
      await api("/api/store/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          notes: notes || undefined,
          isCredit,
          paidAmount,
          creditAmount,
          items: validLines,
        }),
      });
      reload();
      onDone();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-2xl space-y-5">
      <h2 className="font-display text-lg font-bold">
        {lang === "am" ? "አዲስ የግዢ ትዕዛዝ" : "New Purchase Order"}
      </h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={lang === "am" ? "አቅራቢ" : "Supplier"}>
            <Select
              value={supplierId}
              onChange={(e) => {
                if (e.target.value === "__add_new__") setShowAddSupplier(true);
                else setSupplierId(e.target.value);
              }}
            >
              <option value="">{lang === "am" ? "— ምረጥ —" : "— Select —"}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="__add_new__">{lang === "am" ? "➕ አዲስ አቅራቢ ጨምር…" : "➕ Add new supplier…"}</option>
            </Select>
          </Field>
          <Field label={lang === "am" ? "ማስታወሻ" : "Notes"}>
            <Input placeholder={lang === "am" ? "ማስታወሻ..." : "Optional notes..."} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-foreground">
              {lang === "am" ? "ዕቃዎች" : "Line Items"}
            </h3>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-accent/15 px-2.5 py-1 text-xs font-medium text-brand-accentText transition-colors hover:bg-brand-accent/25"
            >
              <PlusIcon className="h-3.5 w-3.5" /> {lang === "am" ? "ጨምር" : "Add Item"}
            </button>
          </div>
          {lines.map((line, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <div className="flex-[2]">
                <Field label={lang === "am" ? "ዕቃ" : "Item"}>
                  <Select
                    value={line.inventoryItemId}
                    onChange={(e) => {
                      const item = invItems.find((i) => i.id === e.target.value);
                      setLine(idx, {
                        inventoryItemId: e.target.value,
                        unitCost: item?.costPerUnit ?? 0,
                      });
                    }}
                  >
                    <option value="">{lang === "am" ? "— ምረጥ —" : "— Select —"}</option>
                    {invItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex-1">
                <Field label={lang === "am" ? "ብዛት" : "Qty"}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity || ""}
                    onChange={(e) => setLine(idx, { quantity: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label={lang === "am" ? "ዋጋ/ዩኒት" : "Cost/Unit"}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={line.unitCost || ""}
                    onChange={(e) => setLine(idx, { unitCost: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <div className="flex-shrink-0 pb-0.5">
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="rounded-lg p-2 text-brand-muted transition-colors hover:bg-status-red/15 hover:text-status-redText"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Credit Toggle */}
        <Card className="space-y-3 bg-brand-surface2/50">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={isCredit}
                onChange={(e) => setIsCredit(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-brand-border transition-colors peer-checked:bg-brand-accent" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-sm font-medium text-brand-foreground">
              {lang === "am" ? "ብድር (ክሬዲት)" : "Credit Purchase"}
            </span>
          </label>
          {isCredit && (
            <div className="space-y-3 animate-in">
              <Field label={lang === "am" ? "የብድር %" : "Credit %"} hint={lang === "am" ? `${creditPercent}% ብድር, ${100 - creditPercent}% አሁን ክፈል` : `Pay ${100 - creditPercent}% now, ${creditPercent}% on credit`}>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={creditPercent}
                  onChange={(e) => setCreditPercent(Number(e.target.value))}
                  className="w-full accent-brand-accent"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-status-green/10 p-3 text-center">
                  <p className="text-xs text-brand-muted">{lang === "am" ? "አሁን ክፈል" : "Pay Now"}</p>
                  <p className="tabular text-lg font-bold text-status-greenText">{fmtETB(paidAmount)}</p>
                </div>
                <div className="rounded-xl bg-status-red/10 p-3 text-center">
                  <p className="text-xs text-brand-muted">{lang === "am" ? "ብድር" : "Credit"}</p>
                  <p className="tabular text-lg font-bold text-status-redText">{fmtETB(creditAmount)}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Totals + Submit */}
        <div className="flex items-center justify-between border-t border-brand-border pt-4">
          <div>
            <p className="text-xs text-brand-muted">{lang === "am" ? "ጠቅላላ" : "Total"}</p>
            <p className="tabular text-xl font-bold text-brand-foreground">{fmtETB(total)}</p>
          </div>
          <Button type="submit" loading={busy}>
            {lang === "am" ? "ግዢ ፍጠር" : "Create Purchase"}
          </Button>
        </div>
      </form>

      {/* Add-new-supplier modal */}
      <Modal
        open={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        title={lang === "am" ? "አዲስ አቅራቢ" : "New Supplier"}
      >
        <form onSubmit={createSupplier} className="space-y-3">
          <Field label={lang === "am" ? "ስም" : "Name"}>
            <Input
              autoFocus
              placeholder={lang === "am" ? "የአቅራቢ ስም" : "Supplier name"}
              value={newSupplier.name}
              onChange={(e) => setNewSupplier((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>
          <Field label={lang === "am" ? "ስልክ" : "Phone"}>
            <Input
              placeholder={lang === "am" ? "አማራጭ" : "Optional"}
              value={newSupplier.phone}
              onChange={(e) => setNewSupplier((s) => ({ ...s, phone: e.target.value }))}
            />
          </Field>
          <Field label={lang === "am" ? "የመገናኛ ሰው" : "Contact Person"}>
            <Input
              placeholder={lang === "am" ? "አማራጭ" : "Optional"}
              value={newSupplier.contact}
              onChange={(e) => setNewSupplier((s) => ({ ...s, contact: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setShowAddSupplier(false)}>
              {lang === "am" ? "ሰርዝ" : "Cancel"}
            </Button>
            <Button type="submit" loading={savingSupplier} disabled={!newSupplier.name.trim()}>
              {lang === "am" ? "አስቀምጥ" : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

/* ── Credits List ──────────────────────────────────────────────── */
function CreditsList({ credits, reload, lang }: { credits: PO[]; reload: () => void; lang: string }) {
  const [payModal, setPayModal] = useState<PO | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function payCredit() {
    if (!payModal) return;
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) return;
    setBusy(true);
    try {
      await api(`/api/store/purchase-orders/${payModal.id}/pay-credit`, {
        method: "PATCH",
        body: JSON.stringify({ amount: amt }),
      });
      reload();
      setPayModal(null);
      setPayAmount("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  const totalOutstanding = credits.reduce((s, p) => s + Number(p.creditAmount), 0);

  return (
    <div className="space-y-4">
      {totalOutstanding > 0 && (
        <Card className="flex items-center gap-4 border-status-red/30 bg-status-red/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-red/15">
            <CoinsIcon className="h-6 w-6 text-status-redText" />
          </div>
          <div>
            <p className="text-xs text-brand-muted">{lang === "am" ? "ጠቅላላ ያልተከፈለ ብድር" : "Total Outstanding Credit"}</p>
            <p className="tabular text-2xl font-bold text-status-redText">{fmtETB(totalOutstanding)}</p>
          </div>
        </Card>
      )}
      {credits.length === 0 ? (
        <EmptyState icon={<CheckCircleIcon className="h-7 w-7" />}>
          {lang === "am" ? "ያልተከፈለ ብድር የለም 🎉" : "No outstanding credits 🎉"}
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {credits.map((po) => {
            const credit = Number(po.creditAmount);
            const total = Number(po.total);
            const paidPct = total > 0 ? Math.round(((total - credit) / total) * 100) : 100;
            return (
              <Card key={po.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{po.supplier?.name ?? "—"}</p>
                    <p className="text-xs text-brand-muted">{fmtDate(po.createdAt)}</p>
                  </div>
                  <span className="tabular rounded-full bg-status-red/15 px-2.5 py-0.5 text-xs font-bold text-status-redText">
                    {fmtETB(credit)}
                  </span>
                </div>
                {/* Progress bar */}
                <div>
                  <div className="mb-1 flex justify-between text-xs text-brand-muted">
                    <span>{lang === "am" ? "የተከፈለ" : "Paid"}</span>
                    <span>{paidPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-brand-border">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-status-green to-emerald-400 transition-all"
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setPayModal(po);
                    setPayAmount(credit.toString());
                  }}
                >
                  {lang === "am" ? "ብድር ክፈል" : "Pay Credit"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pay Credit Modal */}
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={lang === "am" ? "ብድር ክፈል" : "Pay Credit"}
      >
        {payModal && (
          <div className="space-y-4">
            <div className="text-sm text-brand-muted">
              {payModal.supplier?.name ?? "—"} · {lang === "am" ? "ቀሪ ብድር" : "Remaining credit"}: <strong className="text-status-redText">{fmtETB(Number(payModal.creditAmount))}</strong>
            </div>
            <Field label={lang === "am" ? "መክፈል የሚፈለግ" : "Payment Amount"}>
              <Input
                type="number"
                min={0}
                max={Number(payModal.creditAmount)}
                step="any"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setPayModal(null)}>{lang === "am" ? "ሰርዝ" : "Cancel"}</Button>
              <Button onClick={payCredit} loading={busy}>{lang === "am" ? "ክፈል" : "Pay"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Report ────────────────────────────────────────────────────── */
function PurchaseReport({ pos, lang }: { pos: PO[]; lang: string }) {
  /* Group by supplier */
  const bySupplier = useMemo(() => {
    const map = new Map<string, { name: string; total: number; paid: number; credit: number; count: number }>();
    for (const po of pos) {
      const name = po.supplier?.name ?? (lang === "am" ? "ያልታወቀ" : "Unknown");
      const prev = map.get(name) || { name, total: 0, paid: 0, credit: 0, count: 0 };
      prev.total += Number(po.total);
      prev.paid += Number(po.paidAmount);
      prev.credit += Number(po.creditAmount);
      prev.count += 1;
      map.set(name, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [pos, lang]);

  /* Group by month */
  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; paid: number; credit: number; count: number }>();
    for (const po of pos) {
      const key = new Date(po.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      const prev = map.get(key) || { total: 0, paid: 0, credit: 0, count: 0 };
      prev.total += Number(po.total);
      prev.paid += Number(po.paidAmount);
      prev.credit += Number(po.creditAmount);
      prev.count += 1;
      map.set(key, prev);
    }
    return Array.from(map.entries());
  }, [pos]);

  return (
    <div className="space-y-5">
      {/* By supplier */}
      <Card className="space-y-3">
        <h3 className="font-display text-base font-bold">
          {lang === "am" ? "በአቅራቢ" : "By Supplier"}
        </h3>
        {bySupplier.length === 0 ? (
          <p className="text-sm text-brand-muted">{lang === "am" ? "ምንም ዳታ የለም" : "No data"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left text-xs font-medium text-brand-muted">
                  <th className="pb-2 pr-4">{lang === "am" ? "አቅራቢ" : "Supplier"}</th>
                  <th className="pb-2 pr-4 text-right">{lang === "am" ? "ትዕዛዞች" : "Orders"}</th>
                  <th className="pb-2 pr-4 text-right">{lang === "am" ? "ጠቅላላ" : "Total"}</th>
                  <th className="pb-2 pr-4 text-right">{lang === "am" ? "የተከፈለ" : "Paid"}</th>
                  <th className="pb-2 text-right">{lang === "am" ? "ብድር" : "Credit"}</th>
                </tr>
              </thead>
              <tbody>
                {bySupplier.map((row) => (
                  <tr key={row.name} className="border-b border-brand-border/30">
                    <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                    <td className="py-2.5 pr-4 tabular text-right">{row.count}</td>
                    <td className="py-2.5 pr-4 tabular text-right">{fmtETB(row.total)}</td>
                    <td className="py-2.5 pr-4 tabular text-right text-status-greenText">{fmtETB(row.paid)}</td>
                    <td className={`py-2.5 tabular text-right ${row.credit > 0 ? "text-status-redText font-semibold" : "text-brand-muted"}`}>
                      {fmtETB(row.credit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* By month */}
      <Card className="space-y-3">
        <h3 className="font-display text-base font-bold">
          {lang === "am" ? "በወር" : "By Month"}
        </h3>
        {byMonth.length === 0 ? (
          <p className="text-sm text-brand-muted">{lang === "am" ? "ምንም ዳታ የለም" : "No data"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left text-xs font-medium text-brand-muted">
                  <th className="pb-2 pr-4">{lang === "am" ? "ወር" : "Month"}</th>
                  <th className="pb-2 pr-4 text-right">{lang === "am" ? "ትዕዛዞች" : "Orders"}</th>
                  <th className="pb-2 pr-4 text-right">{lang === "am" ? "ጠቅላላ" : "Total"}</th>
                  <th className="pb-2 pr-4 text-right">{lang === "am" ? "የተከፈለ" : "Paid"}</th>
                  <th className="pb-2 text-right">{lang === "am" ? "ብድር" : "Credit"}</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map(([month, row]) => (
                  <tr key={month} className="border-b border-brand-border/30">
                    <td className="py-2.5 pr-4 font-medium">{month}</td>
                    <td className="py-2.5 pr-4 tabular text-right">{row.count}</td>
                    <td className="py-2.5 pr-4 tabular text-right">{fmtETB(row.total)}</td>
                    <td className="py-2.5 pr-4 tabular text-right text-status-greenText">{fmtETB(row.paid)}</td>
                    <td className={`py-2.5 tabular text-right ${row.credit > 0 ? "text-status-redText font-semibold" : "text-brand-muted"}`}>
                      {fmtETB(row.credit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
