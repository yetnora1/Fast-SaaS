"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/fetcher";
import { Button, Card, Input } from "@/components/ui";
import { useLang } from "@/lib/i18n";

export default function RegisterPage() {
  const { t } = useLang();
  const router = useRouter();
  const [form, setForm] = useState({ businessName: "", ownerName: "", email: "", phone: "", password: "", address: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
      router.push("/owner/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 font-display text-2xl font-bold">{t("registerCafe")}</h1>
        <p className="mb-4 text-xs text-brand-muted">{t("startsTrial")}</p>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder={t("businessName")} value={form.businessName} onChange={set("businessName")} required />
          <Input placeholder={t("ownerName")} value={form.ownerName} onChange={set("ownerName")} required />
          <Input type="email" placeholder={t("email")} value={form.email} onChange={set("email")} required />
          <Input placeholder={t("phone")} value={form.phone} onChange={set("phone")} />
          <Input placeholder={t("address")} value={form.address} onChange={set("address")} />
          <Input type="password" placeholder={t("passwordMin")} value={form.password} onChange={set("password")} required />
          {error && <p className="text-sm text-status-redText">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">
            {busy ? t("creating") : t("createAccount")}
          </Button>
        </form>
      </Card>
    </main>
  );
}
