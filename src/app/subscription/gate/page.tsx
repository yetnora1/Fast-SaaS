"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/fetcher";
import { Button, Card } from "@/components/ui";
import { ClockIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface StatusResp {
  status: { state: string };
  latest: { status: string; rejectReason?: string } | null;
  bank: { name: string; accountNumber: string; accountName: string };
  amount: number;
  periodMonths: number;
}

export default function SubscriptionGatePage() {
  const { t } = useLang();
  const [data, setData] = useState<StatusResp | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setData(await api<StatusResp>("/api/owner/subscription/status"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      const res = await fetch("/api/owner/subscription/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pending = data?.latest?.status === "PENDING" || data?.status.state === "PENDING";

  return (
    <main className="fixed inset-0 z-modal flex items-center justify-center bg-black/80 p-6 backdrop-blur">
      <Card className="w-full max-w-lg">
        <h1 className="text-center font-display text-2xl font-bold">{t("subscriptionRequired")}</h1>
        {data && (
          <>
            <div className="my-4 text-center">
              <div className="tabular text-3xl font-bold text-brand-accent">{data.amount.toLocaleString()} ETB</div>
              <div className="text-sm text-brand-muted">{t("forLabel")} {data.periodMonths} {t("months")}</div>
            </div>

            {pending ? (
              <div className="flex flex-col items-center py-6 text-center text-status-blue">
                <ClockIcon className="h-10 w-10" />
                <div className="mt-2 text-lg">{t("receiptUnderReview")}</div>
                <p className="mt-2 text-sm text-brand-muted">{t("notifyEmailApproved")}</p>
              </div>
            ) : (
              <>
                {data.latest?.status === "REJECTED" && (
                  <p className="mb-3 rounded-lg bg-status-red/15 px-3 py-2 text-sm text-status-red">
                    {data.latest.rejectReason}
                  </p>
                )}
                <div className="space-y-1 rounded-xl border border-brand-border bg-brand-surface2 p-4 text-sm">
                  <div className="text-brand-muted">{t("transferTo")}</div>
                  <div><b>{t("bankLabel")}</b> {data.bank.name}</div>
                  <div><b>{t("accountNo")}</b> {data.bank.accountNumber}</div>
                  <div><b>{t("accountNameLabel")}</b> {data.bank.accountName}</div>
                </div>
                <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-brand-foreground">
                  <li>{t("step1")}</li>
                  <li>{t("step2")}</li>
                  <li>{t("step3")}</li>
                </ol>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-3 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-surface2 file:px-3 file:py-1.5 file:text-sm file:text-brand-foreground"
                />
                {error && <p className="mt-2 text-sm text-status-red">{error}</p>}
                <Button onClick={upload} loading={busy} disabled={!file} className="mt-3 w-full">
                  {busy ? t("uploading") : t("sendForApproval")}
                </Button>
              </>
            )}
          </>
        )}
        {error && !data && <p className="mt-2 text-sm text-status-red">{error}</p>}
      </Card>
    </main>
  );
}
