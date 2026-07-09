"use client";
import { useState } from "react";
import { usePoll } from "@/components/fetcher";
import { Card, StatusChip, TimerBadge, PageHeader, LiveDot, EmptyState, Button, Modal } from "@/components/ui";
import { AlertTriangleIcon, InboxIcon } from "@/components/icons";
import { TableQRCodes } from "@/components/TableQR";
import { FeedbackCard } from "@/components/FeedbackCard";
import { useLang } from "@/lib/i18n";

interface Order { id: string; status: string; submittedAt: string | null; table: { number: number } | null; waiter: { name: string } | null; items: { id: string }[] }

export default function ManagerDashboard() {
  const { t } = useLang();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const orders = usePoll<{ orders: Order[] }>("/api/manager/orders/live", 4000);
  const alerts = usePoll<{ alerts: { id: string; name: string; status: string }[] }>("/api/manager/inventory/alerts", 10000);

  return (
    <div className="space-y-5">
      <PageHeader title={t("operationsDashboard")} subtitle="Live floor & kitchen activity">
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsQrModalOpen(true)} variant="ghost" size="sm" className="font-semibold tracking-wider">
            📱 QR CODE
          </Button>
          <LiveDot label={t("live")} />
        </div>
      </PageHeader>

      <div className="grid gap-3">
        <Card>
          <div className="mb-2 font-medium">{t("liveOrderFeed")}</div>
          <div className="space-y-1 text-sm">
            {orders.data?.orders.length === 0 && <EmptyState icon={<InboxIcon className="h-7 w-7" />}>{t("noLiveOrders")}</EmptyState>}
            {orders.data?.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-t border-brand-border/60 py-1.5">
                <span>{t("table")} {o.table?.number ?? "—"} · <span className="tabular">{o.items.length}</span> {t("items")} · <span className="text-brand-muted">{o.waiter?.name ?? ""}</span></span>
                <span className="flex items-center gap-2"><StatusChip status={o.status} />{o.submittedAt && <TimerBadge since={o.submittedAt} />}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Table QR Codes" className="max-w-4xl">
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <TableQRCodes />
        </div>
      </Modal>

      {alerts.data && alerts.data.alerts.length > 0 && (
        <Card className="border-status-red/40 bg-status-red/10">
          <div className="mb-2 flex items-center gap-2 font-medium text-status-red">
            <AlertTriangleIcon className="h-5 w-5" />
            {t("inventoryAlerts")}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {alerts.data.alerts.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-bg/40 px-2.5 py-1.5">
                {a.name} <StatusChip status={a.status} />
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Customer Feedback — branch-scoped */}
      <FeedbackCard station="ALL" />
    </div>
  );
}
