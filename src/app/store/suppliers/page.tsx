"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Supplier { id: string; name: string; contact: string | null; phone: string | null; email: string | null; paymentTerms: string | null }

export default function Suppliers() {
  const { t } = useLang();
  const { data, reload } = usePoll<{ suppliers: Supplier[] }>("/api/store/suppliers", 0);
  const [form, setForm] = useState({ name: "", contact: "", phone: "", email: "", paymentTerms: "" });

  async function add() {
    await api("/api/store/suppliers", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", contact: "", phone: "", email: "", paymentTerms: "" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("supplierDirectory")} />
      <Card className="space-y-2">
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder={t("name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder={t("contact")} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <Input placeholder={t("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder={t("email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder={t("paymentTerms")} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
        </div>
        <Button onClick={add} disabled={!form.name}>{t("addSupplier")}</Button>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {data?.suppliers.map((s) => (
          <Card key={s.id}>
            <div className="font-display font-bold">{s.name}</div>
            <div className="text-sm text-brand-muted">{s.contact} · {s.phone}</div>
            <div className="text-xs text-brand-muted">{s.email} · {s.paymentTerms}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
