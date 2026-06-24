"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/fetcher";
import { Button, Card, Input, Field, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";

export default function ConfigPage() {
  const { t } = useLang();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<Record<string, string>>("/api/saas/config").then(setConfig);
  }, []);

  async function save() {
    setMsg(null);
    await api("/api/saas/config", { method: "PUT", body: JSON.stringify(config) });
    setMsg(t("saved"));
  }

  const fields = ["bank_name", "account_number", "account_name", "vat_rate", "subscription_amount", "global_announcement"];

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader title={t("platformConfig")} />
      <Card className="space-y-3">
        {fields.map((f) => (
          <Field key={f} label={f}>
            <Input value={config[f] ?? ""} onChange={(e) => setConfig({ ...config, [f]: e.target.value })} />
          </Field>
        ))}
        <Button onClick={save}>{t("saveConfig")}</Button>
        {msg && <p className="text-sm text-brand-accent">{msg}</p>}
      </Card>
    </div>
  );
}
