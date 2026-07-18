"use client";
import { usePoll } from "@/components/fetcher";
import { Card, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { PrinterSettings } from "@/components/PrinterSettings";

export default function ManagerPrinterPage() {
  const { navLabel } = useLang();
  const me = usePoll<{ role: string; branchId?: string } | null>("/api/auth/me", 0);

  if (me.loading) {
    return <div className="text-sm text-brand-muted py-8 text-center">Loading profile...</div>;
  }

  const branchId = me.data?.branchId;

  return (
    <div className="space-y-5">
      <PageHeader title={navLabel("Printer")} />
      {branchId ? (
        <Card className="p-6">
          <PrinterSettings branchId={branchId} />
        </Card>
      ) : (
        <div className="text-sm text-brand-muted py-8 text-center">No branch assigned to this account.</div>
      )}
    </div>
  );
}
