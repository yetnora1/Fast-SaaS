"use client";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { InboxIcon, AlertTriangleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface OItem { id: string; menuItem: { name: string; nameAm?: string | null }; status: string }
interface Order { id: string; status: string; declineReason?: string | null; table: { number: number } | null; items: OItem[] }

export default function MyOrders() {
  const { t, tr, statusLabel } = useLang();
  const { data, reload } = usePoll<{ orders: Order[] }>("/api/waiter/orders", 4000);

  async function deliver(orderId: string, itemId: string) {
    await api(`/api/waiter/orders/${orderId}/items/${itemId}/deliver`, { method: "PATCH" });
    reload();
  }
  async function requestBill(orderId: string) {
    await api(`/api/waiter/orders/${orderId}/bill`, { method: "POST" });
    reload();
  }
  async function dismiss(orderId: string) {
    // Void the declined order so it disappears from the list
    try {
      await api(`/api/waiter/orders/${orderId}`, { method: "DELETE" });
    } catch {
      // If no delete endpoint, just reload
    }
    reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("myActiveOrders")} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data?.orders.map((o) => (
          <Card key={o.id} className={`space-y-2 ${o.status === "DECLINED" ? "border-status-red/40" : o.status === "PENDING_REVIEW" ? "border-status-yellow/40" : ""}`}>
            <div className="flex justify-between">
              <span className="font-medium">{t("table")} {o.table?.number ?? "—"}</span>
              <StatusChip status={o.status} />
            </div>

            {/* Declined banner */}
            {o.status === "DECLINED" && (
              <div className="flex items-start gap-2 rounded-lg bg-status-red/10 border border-status-red/20 p-2.5">
                <AlertTriangleIcon className="h-4 w-4 text-status-redText shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-status-redText">{t("orderDeclined")}</div>
                  {o.declineReason && <div className="text-xs text-status-redText/80 mt-0.5">{o.declineReason}</div>}
                </div>
              </div>
            )}

            {/* Pending cashier banner */}
            {o.status === "PENDING_REVIEW" && (
              <div className="flex items-center gap-2 rounded-lg bg-status-yellow/10 border border-status-yellow/20 p-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-status-yellow/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-status-yellow" />
                </span>
                <span className="text-xs font-medium text-status-yellowText">{t("awaitingCashier")}</span>
              </div>
            )}

            <ul className="text-sm space-y-1">
              {o.items.map((it) => (
                <li key={it.id} className="flex justify-between items-center">
                  <span>{tr(it.menuItem.name, it.menuItem.nameAm)} <span className="text-xs text-brand-muted">({statusLabel(it.status)})</span></span>
                  {it.status === "READY" && <Button variant="ghost" onClick={() => deliver(o.id, it.id)}>{t("delivered")}</Button>}
                </li>
              ))}
            </ul>

            {o.status === "DECLINED" ? (
              <Button variant="ghost" className="w-full text-status-redText" onClick={() => dismiss(o.id)}>Dismiss</Button>
            ) : (() => {
              const active = o.items.filter((i) => i.status !== "VOIDED" && i.status !== "REJECTED");
              const allServed = active.length > 0 && active.every((i) => i.status === "READY" || i.status === "DELIVERED");
              if (o.status === "PENDING_REVIEW") return null;
              if (allServed) return <Button className="w-full" onClick={() => requestBill(o.id)}>{t("requestBill")}</Button>;
              return null;
            })()}
          </Card>
        ))}
        {data?.orders.length === 0 && <EmptyState icon={<InboxIcon className="h-7 w-7" />}>{t("noActiveOrders")}</EmptyState>}
      </div>
    </div>
  );
}
