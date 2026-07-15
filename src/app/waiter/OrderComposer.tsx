"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Modifier { id: string; groupName: string; option: string; extraPrice: string }
interface Item { id: string; name: string; nameAm: string | null; price: string; modifiers: Modifier[]; station: string; imageUrl?: string | null }
interface Category { id: string; name: string; nameAm: string | null; items: Item[] }
interface CartLine { menuItemId: string; name: string; nameAm: string | null; quantity: number; notes?: string; allergyNote?: string }

/** Shared menu + cart composer used by the New Order page and the floor-plan modal. */
export function OrderComposer({ tableId, onSent }: { tableId?: string; onSent: () => void }) {
  const { t, tr } = useLang();
  const { data } = usePoll<{ categories: Category[] }>("/api/waiter/menu", 0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  function add(item: Item) {
    setCart((c) => {
      const existing = c.find((l) => l.menuItemId === item.id && !l.notes && !l.allergyNote);
      if (existing) return c.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { menuItemId: item.id, name: item.name, nameAm: item.nameAm, quantity: 1 }];
    });
  }
  function setNote(i: number, field: "notes" | "allergyNote", val: string) {
    setCart((c) => c.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)));
  }

  async function send() {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      await api("/api/waiter/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId,
          items: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, notes: l.notes, allergyNote: l.allergyNote })),
          submit: true,
        }),
      });
      setSent(true);
      setTimeout(onSent, 900);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <div className="text-4xl">✓</div>
        <div className="font-display text-lg font-bold text-status-greenText">{t("orderPlaced")}</div>
        <div className="text-sm text-brand-muted">{t("awaitingCashier")}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-4 md:col-span-2">
        {/* View toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-brand-muted">{t("menu")}</span>
          <div className="inline-flex rounded-lg border border-brand-border overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === "grid" ? "bg-brand-accent text-white" : "bg-brand-surface text-brand-muted hover:bg-brand-surface2"}`}
            >
              <svg className="h-3.5 w-3.5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              {t("gridView")}
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === "list" ? "bg-brand-accent text-white" : "bg-brand-surface text-brand-muted hover:bg-brand-surface2"}`}
            >
              <svg className="h-3.5 w-3.5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              {t("listView")}
            </button>
          </div>
        </div>

        {data?.categories.map((c) => (
          <Card key={c.id}>
            <div className="mb-2 font-medium">{tr(c.name, c.nameAm)}</div>

            {viewMode === "grid" ? (
              /* ── Grid View ── */
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {c.items.map((it) => (
                  <button key={it.id} onClick={() => add(it)} className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface2 text-left transition-all hover:border-brand-accent/40 hover:shadow-sm min-h-[48px] min-w-[48px]">
                    {it.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt="" className="h-20 w-full object-cover" />
                    )}
                    <div className="p-3">
                      <div className="text-sm font-medium">{tr(it.name, it.nameAm)}</div>
                      <div className="tabular mt-0.5 flex items-center gap-1.5 text-xs text-brand-muted">
                        {Number(it.price).toLocaleString()} ETB
                        <span className={`h-1.5 w-1.5 rounded-full ${it.station === "BARISTA" ? "bg-status-blue" : "bg-status-yellow"}`} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* ── List View ── */
              <div className="space-y-1">
                {c.items.map((it) => (
                  <button key={it.id} onClick={() => add(it)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-surface2 px-3 py-2.5 text-left transition-all hover:border-brand-accent/40 min-h-[48px]">
                    <div className="flex items-center gap-3 min-w-0">
                      {it.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{tr(it.name, it.nameAm)}</div>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${it.station === "BARISTA" ? "bg-status-blue" : "bg-status-yellow"}`} />
                          <span className="text-[10px] text-brand-muted">{it.station === "BARISTA" ? "Bar" : "Kitchen"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="tabular text-sm font-semibold text-brand-muted shrink-0">
                      {Number(it.price).toLocaleString()} ETB
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <Card className="sticky top-2">
          <div className="mb-2 font-medium">{t("cart")} <span className="tabular text-brand-muted">({cart.length})</span></div>
          {cart.length === 0 && <p className="text-sm text-brand-muted">{t("tapToAdd")}</p>}
          <div className="space-y-3">
            {cart.map((l, i) => (
              <div key={i} className="border-t border-brand-border/60 pt-2 text-sm">
                <div className="flex justify-between">
                  <span>{l.quantity}× {tr(l.name, l.nameAm)}</span>
                  <button className="text-xs text-status-redText hover:underline" onClick={() => setCart((c) => c.filter((_, idx) => idx !== i))}>{t("remove")}</button>
                </div>
                <Input className="mt-1 text-xs" placeholder={t("notes")} value={l.notes ?? ""} onChange={(e) => setNote(i, "notes", e.target.value)} />
                <Input className="mt-1 text-xs" placeholder={t("allergyNote")} value={l.allergyNote ?? ""} onChange={(e) => setNote(i, "allergyNote", e.target.value)} />
              </div>
            ))}
          </div>
          <Button className="mt-3 w-full" onClick={send} loading={busy} disabled={cart.length === 0}>
            {busy ? t("sending") : t("sendToCashier")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
