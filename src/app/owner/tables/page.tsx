"use client";
import React, { useState, useEffect } from "react";
import { usePoll } from "@/components/fetcher";
import { TablesManagement } from "@/components/TablesManagement";
import { Card, PageHeader, Select, Skeleton, EmptyState } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { StoreIcon } from "@/components/icons";

interface Branch {
  id: string;
  name: string;
}

export default function OwnerTablesPage() {
  const { t, lang, navLabel } = useLang();
  const { data: branchesData, loading } = usePoll<{ branches: Branch[] }>(
    "/api/owner/branches",
    0
  );

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedBranchName, setSelectedBranchName] = useState<string>("");

  useEffect(() => {
    if (branchesData?.branches && branchesData.branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branchesData.branches[0].id);
      setSelectedBranchName(branchesData.branches[0].name);
    }
  }, [branchesData, selectedBranchId]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedBranchId(id);
    const branch = branchesData?.branches.find((b) => b.id === id);
    if (branch) setSelectedBranchName(branch.name);
  };

  if (loading || !branchesData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const branches = branchesData.branches;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={lang === "am" ? "የጠረጴዛዎች & QR ማኔጅመንት" : "Tables & QR Codes"} 
        subtitle={lang === "am" ? "የቅርንጫፍ ጠረጴዛዎችን ይቆጣጠሩ እና የQR ኮዶችን ያውጡ" : "Manage branch tables and generate customer ordering QR codes"} 
      />

      {branches.length === 0 ? (
        <EmptyState icon={<StoreIcon className="h-7 w-7" />}>
          {lang === "am" ? "ምንም ቅርንጫፍ አልተገኘም። እባክዎ መጀመሪያ ቅርንጫፍ ይፍጠሩ።" : "No branches found. Please create a branch first."}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {/* Branch Selector Bar */}
          <Card className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div className="flex flex-1 items-center gap-3 max-w-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-surface2 text-brand-foreground/80">
                <StoreIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <Select value={selectedBranchId} onChange={handleBranchChange}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div className="text-xs text-brand-muted font-medium">
              {lang === "am" ? "የተመረጠው ቅርንጫፍ ID:" : "Active Branch ID:"}{" "}
              <code className="rounded bg-brand-surface2 px-1.5 py-0.5 text-brand-foreground font-mono">{selectedBranchId}</code>
            </div>
          </Card>

          {/* Render Tables setup for selected branch */}
          {selectedBranchId && (
            <TablesManagement 
              key={selectedBranchId}
              branchId={selectedBranchId}
              branchName={selectedBranchName}
            />
          )}
        </div>
      )}
    </div>
  );
}
