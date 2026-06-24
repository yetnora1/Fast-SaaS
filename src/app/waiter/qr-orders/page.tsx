"use client";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, PageHeader, LiveDot } from "@/components/ui";
import { InboxIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Order { id: string; table: { number: number } | null; items: { id: string; menuItem: { name: string; nameAm?: string | null }; quantity: number }[] }

export default function QROrders() {
  const { t, tr } = useLang();
  const { data, reload } = usePoll<{ orders: Order[] }>("/api/waiter/qr-orders", 5000);

  async function confirm(id: string) {
    await api(`/api/waiter/qr-orders/${id}/confirm`, { method: "POST" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("incomingQr")}>
        <LiveDot label={t("live")} />
      </PageHeader>
      {data?.orders.length === 0 && <EmptyState icon={<InboxIcon className="h-7 w-7" />}>{t("noPendingQr")}</EmptyState>}
      <div className="grid gap-3 md:grid-cols-3">
        {data?.orders.map((o) => (
          <Card key={o.id} className="space-y-2">
            <div className="font-medium">{t("table")} {o.table?.number ?? "—"}</div>
            <ul className="text-sm">
              {o.items.map((it) => <li key={it.id}>{it.quantity}× {tr(it.menuItem.name, it.menuItem.nameAm)}</li>)}
            </ul>
            <Button className="w-full" onClick={() => confirm(o.id)}>{t("confirmFireKds")}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
