"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/components/fetcher";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { useLang } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center p-6"><Spinner /></main>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pinMode, setPinMode] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = pinMode
        ? await api<{ home: string }>("/api/auth/login/pin", { method: "POST", body: JSON.stringify({ branchId, pin }) })
        : await api<{ home: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push(params.get("next") ?? res.home);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl font-bold">
          Cafe<span className="text-brand-accent">Flow</span>
        </h1>
        <p className="mb-4 text-xs text-brand-muted">{pinMode ? t("posPinLogin") : t("emailPassword")}</p>
        <form onSubmit={submit} className="space-y-3">
          {pinMode ? (
            <>
              <Input placeholder={t("branchIdPlaceholder")} value={branchId} onChange={(e) => setBranchId(e.target.value)} required />
              <Input placeholder={t("pin4")} inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} required />
            </>
          ) : (
            <>
              <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </>
          )}
          {error && <p className="text-sm text-status-red">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">
            {busy ? t("signingIn") : t("signIn")}
          </Button>
        </form>
        <button onClick={() => setPinMode(!pinMode)} className="mt-3 text-xs font-medium text-brand-accent hover:underline">
          {pinMode ? t("useEmailPassword") : t("usePosPin")}
        </button>
      </Card>
    </main>
  );
}
