"use client";
import { usePoll } from "@/components/fetcher";
import { Card, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Log {
  id: string;
  action: string;
  entity: string | null;
  userId: string | null;
  ip: string | null;
  createdAt: string;
}

export default function AuditLogPage() {
  const { t } = useLang();
  const { data } = usePoll<{ logs: Log[]; total: number }>("/api/saas/audit-log", 0);
  return (
    <div className="space-y-5">
      <PageHeader title={`${t("auditLogTitle")}${data ? ` (${data.total})` : ""}`} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="p-2 font-medium">{t("when")}</th>
              <th className="p-2 font-medium">{t("actionCol")}</th>
              <th className="p-2 font-medium">{t("entity")}</th>
              <th className="p-2 font-medium">{t("user")}</th>
              <th className="p-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map((l) => (
              <tr key={l.id} className="border-t border-brand-border/60">
                <td className="tabular p-2 text-brand-muted">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="p-2 font-mono text-xs text-brand-accent">{l.action}</td>
                <td className="p-2">{l.entity ?? "—"}</td>
                <td className="p-2 text-xs text-brand-muted">{l.userId ?? "—"}</td>
                <td className="tabular p-2 text-xs text-brand-muted">{l.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
