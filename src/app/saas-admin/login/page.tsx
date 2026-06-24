"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/fetcher";
import { Button, Card, Input } from "@/components/ui";
import { GlobeIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

export default function SaasLoginPage() {
  const { lang, toggle, t, navLabel } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ home: string; role: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (res.role !== "saas_owner") throw new Error("Not a SaaS Owner account");
      router.push(res.home);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">{navLabel("SaaS Admin")}</h1>
          <button onClick={toggle} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-surface2 px-2.5 py-1.5 text-sm transition-colors hover:bg-white/10" title="Language / ቋንቋ">
            <GlobeIcon className="h-4 w-4" />
            {lang === "en" ? "አማ" : "EN"}
          </button>
        </div>
        <p className="mb-4 text-xs text-brand-muted">{t("platformAdminAccess")}</p>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-status-red">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">
            {busy ? t("signingIn") : t("signIn")}
          </Button>
        </form>
      </Card>
    </main>
  );
}
