"use client";
import { Card, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { TableQRCodes } from "@/components/TableQR";

export default function ManagerQRCodesPage() {
  const { navLabel } = useLang();

  return (
    <div className="space-y-5">
      <PageHeader title={navLabel("QR Codes")} />
      <Card className="p-6">
        <TableQRCodes />
      </Card>
    </div>
  );
}
