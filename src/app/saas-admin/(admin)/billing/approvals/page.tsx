"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, Input, Modal, PageHeader } from "@/components/ui";
import { CheckCircleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Pending {
  id: string;
  amount: string;
  receiptUrl: string | null;
  createdAt: string;
  tenant: { name: string };
}

export default function ApprovalsPage() {
  const { t } = useLang();
  const { data, reload } = usePoll<{ pending: Pending[] }>("/api/saas/billing/approvals", 8000);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve(id: string) {
    await api(`/api/saas/billing/approve/${id}`, { method: "POST", body: JSON.stringify({ note: "Verified" }) });
    reload();
  }
  async function confirmReject() {
    if (!rejectId || !reason) return;
    setBusy(true);
    try {
      await api(`/api/saas/billing/reject/${rejectId}`, { method: "POST", body: JSON.stringify({ reason }) });
      setRejectId(null);
      setReason("");
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("pendingReceiptApprovals")} />
      {data?.pending.length === 0 && <EmptyState icon={<CheckCircleIcon className="h-7 w-7" />}>{t("noPendingApprovals")}</EmptyState>}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.pending.map((p) => (
          <Card key={p.id} className="space-y-2">
            <div className="font-display font-bold">{p.tenant.name}</div>
            <div className="tabular text-sm text-brand-muted">
              {Number(p.amount).toLocaleString()} ETB · {t("uploaded")} {new Date(p.createdAt).toLocaleString()}
            </div>
            {p.receiptUrl ? (
              <a href={p.receiptUrl} target="_blank" className="text-sm text-brand-accentText underline">
                {t("viewReceipt")}
              </a>
            ) : (
              <span className="text-xs text-brand-muted">{t("noFile")}</span>
            )}
            <div className="flex gap-2">
              <Button onClick={() => approve(p.id)}>{t("verifyApprove")}</Button>
              <Button variant="danger" onClick={() => { setRejectId(p.id); setReason(""); }}>{t("reject")}</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title={t("rejectReceipt")}>
        <div className="space-y-3">
          <Input placeholder={t("rejectionReason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setRejectId(null)}>{t("cancel")}</Button>
            <Button variant="danger" className="flex-1" onClick={confirmReject} disabled={!reason || busy}>{t("reject")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
