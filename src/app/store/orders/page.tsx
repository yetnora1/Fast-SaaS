"use client";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, StatusChip, PageHeader } from "@/components/ui";
import { PackageIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface PO { id: string; status: string; total: string; supplier: { name: string } | null; items: { id: string }[] }

export default function PurchaseOrders() {
  const { t } = useLang();
  const { data, reload } = usePoll<{ purchaseOrders: PO[] }>("/api/store/purchase-orders", 6000);

  async function act(id: string, action: string) {
    await api(`/api/store/purchase-orders/${id}/${action}`, { method: "PATCH" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("purchaseOrders")} subtitle={t("poApprovalNote")} />
      <div className="grid gap-3 md:grid-cols-3">
        {data?.purchaseOrders.map((po) => (
          <Card key={po.id} className="space-y-2">
            <div className="flex justify-between"><span className="font-medium">{po.supplier?.name ?? "—"}</span><StatusChip status={po.status} /></div>
            <div className="tabular text-sm text-brand-muted">{Number(po.total).toLocaleString()} ETB · {po.items.length} {t("lines")}</div>
            <div className="flex gap-2">
              {po.status === "PENDING_APPROVAL" && <Button onClick={() => act(po.id, "approve")}>{t("approve")}</Button>}
              {["APPROVED", "SENT"].includes(po.status) && <Button onClick={() => act(po.id, "receive")}>{t("markReceived")}</Button>}
            </div>
          </Card>
        ))}
        {data?.purchaseOrders.length === 0 && <EmptyState icon={<PackageIcon className="h-7 w-7" />}>{t("noPurchaseOrders")}</EmptyState>}
      </div>
    </div>
  );
}
