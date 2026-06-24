"use client";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { InboxIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface OItem { id: string; menuItem: { name: string; nameAm?: string | null }; status: string }
interface Order { id: string; status: string; table: { number: number } | null; items: OItem[] }

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

  return (
    <div className="space-y-5">
      <PageHeader title={t("myActiveOrders")} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data?.orders.map((o) => (
          <Card key={o.id} className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{t("table")} {o.table?.number ?? "—"}</span>
              <StatusChip status={o.status} />
            </div>
            <ul className="text-sm space-y-1">
              {o.items.map((it) => (
                <li key={it.id} className="flex justify-between items-center">
                  <span>{tr(it.menuItem.name, it.menuItem.nameAm)} <span className="text-xs text-brand-muted">({statusLabel(it.status)})</span></span>
                  {it.status === "READY" && <Button variant="ghost" onClick={() => deliver(o.id, it.id)}>{t("delivered")}</Button>}
                </li>
              ))}
            </ul>
            <Button className="w-full" onClick={() => requestBill(o.id)}>{t("requestBill")}</Button>
          </Card>
        ))}
        {data?.orders.length === 0 && <EmptyState icon={<InboxIcon className="h-7 w-7" />}>{t("noActiveOrders")}</EmptyState>}
      </div>
    </div>
  );
}
