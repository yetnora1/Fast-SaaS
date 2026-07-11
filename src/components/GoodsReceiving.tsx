"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { PackageIcon, CheckCircleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Issue {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  status: "ISSUED" | "RECEIVED";
  note: string | null;
  issuedAt: string;
  receivedAt: string | null;
  issuedBy: { name: string } | null;
  receivedBy: { name: string } | null;
}

/** Station-side receiving screen: confirm goods sent by the store (kitchen & barista). */
export function GoodsReceiving({ station }: { station: "KITCHEN" | "BARISTA" }) {
  const { t } = useLang();
  const { data, reload } = usePoll<{ issues: Issue[] }>(`/api/kds/goods?station=${station}`, 6000);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pending = (data?.issues ?? []).filter((i) => i.status === "ISSUED");
  const history = (data?.issues ?? []).filter((i) => i.status === "RECEIVED").slice(0, 30);

  async function receive(id: string) {
    setBusyId(id);
    setErr(null);
    try {
      await api(`/api/kds/goods/${id}/receive`, { method: "POST" });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("receivingTitle")} subtitle={t("receivingSubtitle")} />

      {err && <p className="text-sm text-status-redText">{err}</p>}

      <Card>
        <div className="mb-3 flex items-center gap-2 font-medium">
          <PackageIcon className="h-5 w-5 text-status-yellowText" />
          {t("pendingDeliveries")}
          {pending.length > 0 && (
            <span className="tabular rounded-full bg-status-yellow/20 px-2 py-0.5 text-xs font-bold text-status-yellowText">{pending.length}</span>
          )}
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={<PackageIcon className="h-7 w-7" />}>{t("noDeliveries")}</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((i) => (
              <div key={i.id} className="flex flex-col gap-2 rounded-xl border border-status-yellow/40 bg-status-yellow/[0.06] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{i.itemName}</div>
                  <div className="tabular shrink-0 rounded-lg bg-brand-surface2 px-2 py-0.5 text-sm font-bold text-brand-accentText">
                    {i.quantity} {i.unit}
                  </div>
                </div>
                <div className="text-xs text-brand-muted">
                  {t("issuedByLabel")}: {i.issuedBy?.name ?? "—"} · {new Date(i.issuedAt).toLocaleTimeString()}
                </div>
                {i.note && <div className="text-xs italic text-brand-muted">&ldquo;{i.note}&rdquo;</div>}
                <Button size="sm" className="mt-auto w-full" loading={busyId === i.id} onClick={() => receive(i.id)}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {t("confirmReceivedBtn")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 font-medium">{t("historyLabel")}</div>
        {history.length === 0 ? (
          <EmptyState icon={<CheckCircleIcon className="h-7 w-7" />}>{t("noDeliveries")}</EmptyState>
        ) : (
          <div className="space-y-1">
            {history.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-surface2 px-3 py-2 text-sm">
                <span className="font-medium">{i.itemName}</span>
                <span className="tabular font-semibold">{i.quantity} {i.unit}</span>
                <span className="text-xs text-brand-muted">
                  {t("receivedByLabel")}: {i.receivedBy?.name ?? "—"} · {i.receivedAt ? new Date(i.receivedAt).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
