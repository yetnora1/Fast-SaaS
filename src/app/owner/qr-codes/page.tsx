"use client";
import { useState, useEffect } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Card, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { TableQRCodes } from "@/components/TableQR";

interface Branch {
  id: string;
  name: string;
  address: string | null;
}

export default function OwnerQRCodesPage() {
  const { navLabel } = useLang();
  const { data, loading } = usePoll<{ branches: Branch[] }>("/api/owner/branches", 0);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  useEffect(() => {
    if (data?.branches && data.branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(data.branches[0].id);
    }
  }, [data, selectedBranchId]);

  if (loading) {
    return <div className="text-sm text-brand-muted py-8 text-center">Loading branches...</div>;
  }

  const branches = data?.branches ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={navLabel("QR Codes")} />
      
      {branches.length > 1 && (
        <Card className="p-4 flex items-center gap-3">
          <label className="text-sm font-semibold text-brand-muted">Select Branch:</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="rounded-xl border border-brand-border bg-brand-surface2 px-3 py-2 text-sm text-brand-foreground focus:border-brand-accent focus:outline-none"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Card>
      )}

      {selectedBranchId ? (
        <Card className="p-6">
          <TableQRCodes branchId={selectedBranchId} />
        </Card>
      ) : (
        <div className="text-sm text-brand-muted py-8 text-center">No branches found. Please add a branch first.</div>
      )}
    </div>
  );
}
